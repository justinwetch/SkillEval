import { unzipSync } from 'fflate'

const TEXT_EXTENSIONS = new Set([
    '.md',
    '.mdx',
    '.txt',
    '.json',
    '.jsonl',
    '.yaml',
    '.yml',
    '.toml',
    '.xml',
    '.csv',
    '.tsv',
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.mjs',
    '.cjs',
    '.py',
    '.rb',
    '.go',
    '.rs',
    '.java',
    '.kt',
    '.swift',
    '.c',
    '.cpp',
    '.h',
    '.hpp',
    '.cs',
    '.php',
    '.sh',
    '.bash',
    '.zsh',
    '.fish',
    '.ps1',
    '.sql',
    '.html',
    '.htm',
    '.css',
    '.scss',
    '.svg',
])

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])

const IMAGE_MEDIA_TYPES = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
}

const MAX_ZIP_BYTES = 25 * 1024 * 1024
const MAX_FILES = 250
const MAX_TEXT_FILE_BYTES = 1024 * 1024
const MAX_TOTAL_TEXT_BYTES = 4 * 1024 * 1024
const MAX_IMAGE_FILE_BYTES = 2 * 1024 * 1024
const MAX_TOTAL_IMAGE_BYTES = 6 * 1024 * 1024

const textDecoder = new TextDecoder('utf-8', { fatal: false })

export function createEmptySkill() {
    return {
        id: null,
        filename: '',
        kind: 'empty',
        packageType: null,
        entrypoint: null,
        files: [],
        omittedFiles: [],
        diagnostics: [],
    }
}

function createId(filename) {
    return `${Date.now().toString(36)}-${filename.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}`
}

function getExtension(path) {
    const match = path.toLowerCase().match(/\.[^./]+$/)
    return match?.[0] || ''
}

function normalizePath(path) {
    return path
        .replaceAll('\\', '/')
        .split('/')
        .filter(Boolean)
        .join('/')
}

function isUnsafePath(path) {
    const parts = path.split('/')
    return parts.includes('..') || path.startsWith('/') || /^[a-z]:/i.test(path)
}

function isJunkPath(path) {
    const parts = path.split('/')
    return parts.some(part => (
        part === '__MACOSX' ||
        part === '.DS_Store' ||
        part === '.git' ||
        part === '.svn' ||
        part === 'node_modules' ||
        part === 'dist' ||
        part === 'build' ||
        part === '.next' ||
        part === '.cache' ||
        part === '.venv' ||
        part === 'venv' ||
        part === '__pycache__'
    ))
}

function getCommonRoot(paths) {
    if (paths.length < 2) return null

    const firstParts = paths[0].split('/')
    if (firstParts.length < 2) return null

    const root = firstParts[0]
    const hasSingleRoot = paths.every(path => path.startsWith(`${root}/`))
    return hasSingleRoot ? root : null
}

function inferRole(path) {
    if (path === 'SKILL.md') return 'entrypoint'
    if (/^references\//i.test(path)) return 'reference'
    if (/^scripts\//i.test(path)) return 'script'
    if (/^assets\//i.test(path)) return 'asset'
    if (/^commands\//i.test(path)) return 'command'
    return 'support'
}

function inferMediaType(path) {
    const extension = getExtension(path)
    if (IMAGE_MEDIA_TYPES[extension]) return IMAGE_MEDIA_TYPES[extension]
    if (extension === '.json') return 'application/json'
    if (extension === '.svg') return 'image/svg+xml'
    if (extension === '.html' || extension === '.htm') return 'text/html'
    if (extension === '.css') return 'text/css'
    if (extension === '.csv') return 'text/csv'
    if (TEXT_EXTENSIONS.has(extension)) return 'text/plain'
    return 'application/octet-stream'
}

function bytesToBase64(bytes) {
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    return btoa(binary)
}

function sortSkillFiles(a, b) {
    const score = path => {
        if (path === 'SKILL.md') return 0
        if (/^README\.md$/i.test(path)) return 1
        if (/^references\//i.test(path)) return 2
        if (/^scripts\//i.test(path)) return 3
        if (/^assets\//i.test(path)) return 4
        return 5
    }

    return score(a.path) - score(b.path) || a.path.localeCompare(b.path)
}

async function hashBytes(bytes) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(hashBuffer))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('')
}

async function createFileRecord(path, bytes, diagnostics, counters) {
    const extension = getExtension(path)
    const mediaType = inferMediaType(path)
    const sha256 = await hashBytes(bytes)
    const baseRecord = {
        path,
        role: inferRole(path),
        mediaType,
        size: bytes.length,
        sha256,
    }

    if (TEXT_EXTENSIONS.has(extension)) {
        const remaining = MAX_TOTAL_TEXT_BYTES - counters.textBytes
        if (remaining <= 0) {
            return {
                omitted: { ...baseRecord, reason: 'Text budget exceeded' },
            }
        }

        const byteLimit = Math.min(MAX_TEXT_FILE_BYTES, remaining)
        const includedBytes = bytes.length > byteLimit ? bytes.subarray(0, byteLimit) : bytes
        const truncated = bytes.length > includedBytes.length
        counters.textBytes += includedBytes.length

        if (truncated) {
            diagnostics.push(`${path} was truncated to ${includedBytes.length.toLocaleString()} bytes for model context safety.`)
        }

        return {
            file: {
                ...baseRecord,
                kind: 'text',
                content: textDecoder.decode(includedBytes),
                truncated,
            },
        }
    }

    if (IMAGE_EXTENSIONS.has(extension)) {
        const remaining = MAX_TOTAL_IMAGE_BYTES - counters.imageBytes
        if (bytes.length <= MAX_IMAGE_FILE_BYTES && bytes.length <= remaining) {
            counters.imageBytes += bytes.length
            return {
                file: {
                    ...baseRecord,
                    kind: 'image',
                    data: bytesToBase64(bytes),
                },
            }
        }

        return {
            omitted: {
                ...baseRecord,
                reason: 'Image exceeds inline model context limit',
            },
        }
    }

    return {
        omitted: {
            ...baseRecord,
            reason: 'Unsupported binary file type',
        },
    }
}

export function isZipFile(file) {
    return file?.name?.toLowerCase().endsWith('.zip') || file?.type === 'application/zip' || file?.type === 'application/x-zip-compressed'
}

export function isPlainSkillFile(file) {
    const name = file?.name?.toLowerCase() || ''
    return name.endsWith('.md') || name.endsWith('.txt') || file?.type === 'text/markdown' || file?.type === 'text/plain'
}

export async function loadSkillFile(file) {
    if (!file) return createEmptySkill()

    if (isZipFile(file)) {
        return loadZipSkill(file)
    }

    if (isPlainSkillFile(file)) {
        const bytes = new Uint8Array(await file.arrayBuffer())
        const content = textDecoder.decode(bytes)
        const sha256 = await hashBytes(bytes)
        const path = file.name.toLowerCase().endsWith('.md') ? 'SKILL.md' : file.name

        return {
            id: createId(file.name),
            filename: file.name,
            kind: 'agent-skill',
            packageType: 'single-file',
            entrypoint: path,
            files: [{
                path,
                role: 'entrypoint',
                kind: 'text',
                mediaType: inferMediaType(path),
                size: bytes.length,
                sha256,
                content,
                truncated: false,
            }],
            omittedFiles: [],
            diagnostics: [],
        }
    }

    throw new Error('Upload a .zip Agent Skill package, .md skill file, or .txt skill file.')
}

async function loadZipSkill(file) {
    if (file.size > MAX_ZIP_BYTES) {
        throw new Error(`ZIP is too large. Maximum supported size is ${Math.round(MAX_ZIP_BYTES / 1024 / 1024)} MB.`)
    }

    const archiveBytes = new Uint8Array(await file.arrayBuffer())
    const entries = unzipSync(archiveBytes)

    const diagnostics = []
    const omittedFiles = []
    const safeEntries = []

    Object.entries(entries).forEach(([rawPath, bytes]) => {
        const path = normalizePath(rawPath)
        if (!path || path.endsWith('/')) return
        if (isUnsafePath(path)) {
            omittedFiles.push({ path, reason: 'Unsafe archive path' })
            return
        }
        if (isJunkPath(path)) {
            omittedFiles.push({ path, reason: 'Ignored generated or system file' })
            return
        }
        safeEntries.push({ path, bytes })
    })

    const commonRoot = getCommonRoot(safeEntries.map(entry => entry.path))
    const normalizedEntries = safeEntries.map(entry => ({
        ...entry,
        path: commonRoot ? entry.path.slice(commonRoot.length + 1) : entry.path,
    })).sort(sortSkillFiles)

    if (normalizedEntries.length > MAX_FILES) {
        diagnostics.push(`Only the first ${MAX_FILES} package files were included; ${normalizedEntries.length - MAX_FILES} were omitted.`)
    }

    const candidateEntries = normalizedEntries.slice(0, MAX_FILES)
    const entrypoints = candidateEntries.filter(entry => entry.path === 'SKILL.md')

    if (entrypoints.length === 0) {
        const nestedSkillFiles = candidateEntries.filter(entry => /(^|\/)SKILL\.md$/i.test(entry.path))
        if (nestedSkillFiles.length === 1) {
            diagnostics.push(`Using nested entrypoint ${nestedSkillFiles[0].path}; Agent Skills should place SKILL.md at the package root.`)
            nestedSkillFiles[0].path = 'SKILL.md'
        } else {
            throw new Error('ZIP does not contain a root SKILL.md file. Agent Skill packages require SKILL.md as the entrypoint.')
        }
    }

    if (entrypoints.length > 1) {
        diagnostics.push('Multiple SKILL.md files were found; using the root SKILL.md entrypoint.')
    }

    const counters = { textBytes: 0, imageBytes: 0 }
    const files = []

    for (const entry of candidateEntries) {
        const result = await createFileRecord(entry.path, entry.bytes, diagnostics, counters)
        if (result.file) files.push(result.file)
        if (result.omitted) omittedFiles.push(result.omitted)
    }

    files.sort(sortSkillFiles)

    if (!files.some(item => item.path === 'SKILL.md' && item.kind === 'text')) {
        throw new Error('SKILL.md must be a text file.')
    }

    return {
        id: createId(file.name),
        filename: file.name,
        kind: 'agent-skill',
        packageType: 'zip',
        entrypoint: 'SKILL.md',
        files,
        omittedFiles,
        diagnostics,
    }
}

export function isSkillReady(skill) {
    return Boolean(
        skill?.files?.some(file => file.path === skill.entrypoint && file.kind === 'text') ||
        skill?.content
    )
}

export function getSkillSummary(skill) {
    if (!isSkillReady(skill)) return ''
    if (!skill.files?.length && skill.content) return '1 text file'
    const textCount = skill.files.filter(file => file.kind === 'text').length
    const imageCount = skill.files.filter(file => file.kind === 'image').length
    const omittedCount = skill.omittedFiles?.length || 0
    const pieces = [`${textCount} text ${textCount === 1 ? 'file' : 'files'}`]
    if (imageCount) pieces.push(`${imageCount} image ${imageCount === 1 ? 'file' : 'files'}`)
    if (omittedCount) pieces.push(`${omittedCount} omitted`)
    return pieces.join(' · ')
}

export function getSkillHashInput(skill) {
    if (!skill) return ''
    if (!skill.files?.length && skill.content) {
        return JSON.stringify({
            filename: skill.filename,
            content: skill.content,
        })
    }

    return JSON.stringify({
        filename: skill.filename,
        packageType: skill.packageType,
        entrypoint: skill.entrypoint,
        files: (skill.files || []).map(file => ({
            path: file.path,
            kind: file.kind,
            mediaType: file.mediaType,
            size: file.size,
            sha256: file.sha256,
            content: file.kind === 'text' ? file.content : undefined,
        })),
        omittedFiles: skill.omittedFiles || [],
    })
}

export function buildSkillPackageParts(skill, label = 'Skill') {
    if (!isSkillReady(skill)) {
        return [{ type: 'text', text: `## ${label}\nNo valid Agent Skill package was provided.` }]
    }

    if (!skill.files?.length && skill.content) {
        return [{
            type: 'text',
            text: [
                `## ${label}: ${skill.filename || 'skill.md'}`,
                'Package type: legacy single text file',
                'Agent Skill entrypoint: SKILL.md',
                '',
                '--- FILE: SKILL.md',
                'role: entrypoint',
                'mediaType: text/markdown',
                '---',
                skill.content,
            ].join('\n'),
        }]
    }

    const files = [...skill.files].sort(sortSkillFiles)
    const parts = [{
        type: 'text',
        text: [
            `## ${label}: ${skill.filename}`,
            `Package type: ${skill.packageType}`,
            `Agent Skill entrypoint: ${skill.entrypoint}`,
            `Included files: ${files.length}`,
            skill.omittedFiles?.length ? `Omitted files: ${skill.omittedFiles.length}` : null,
            skill.diagnostics?.length ? `Diagnostics:\n${skill.diagnostics.map(item => `- ${item}`).join('\n')}` : null,
            '',
            'Use SKILL.md as the package entrypoint. Treat references, scripts, assets, and supporting files as separate package files at their listed relative paths.',
        ].filter(Boolean).join('\n'),
    }]

    for (const file of files) {
        if (file.kind === 'text') {
            parts.push({
                type: 'text',
                text: [
                    `\n--- FILE: ${file.path}`,
                    `role: ${file.role}`,
                    `mediaType: ${file.mediaType}`,
                    file.truncated ? 'truncated: true' : null,
                    '---',
                    file.content,
                ].filter(Boolean).join('\n'),
            })
        } else if (file.kind === 'image') {
            parts.push({
                type: 'text',
                text: `\n--- FILE: ${file.path}\nrole: ${file.role}\nmediaType: ${file.mediaType}\n---\nImage asset attached as a separate content part.`,
            })
            parts.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: file.mediaType,
                    data: file.data,
                },
            })
        }
    }

    if (skill.omittedFiles?.length) {
        parts.push({
            type: 'text',
            text: [
                '\n--- OMITTED PACKAGE FILES ---',
                ...skill.omittedFiles.map(file => `- ${file.path} (${file.reason || 'omitted'}, ${file.size ? `${file.size} bytes` : 'size unknown'})`),
            ].join('\n'),
        })
    }

    return parts
}
