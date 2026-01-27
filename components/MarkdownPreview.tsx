'use client'

import dynamic from 'next/dynamic'
import '@uiw/react-markdown-preview/markdown.css'

// Dynamically import to avoid SSR issues
const MDPreview = dynamic(
    () => import('@uiw/react-markdown-preview').then(mod => mod.default),
    { ssr: false }
)

// Custom styles to ensure proper markdown rendering
const customStyles = `
    .wmde-markdown ul,
    .wmde-markdown ol {
        list-style-position: outside !important;
        padding-left: 1.5em !important;
        margin: 0.5em 0 !important;
    }
    .wmde-markdown ul {
        list-style-type: disc !important;
    }
    .wmde-markdown ol {
        list-style-type: decimal !important;
    }
    .wmde-markdown ul li,
    .wmde-markdown ol li {
        display: list-item !important;
        margin: 0.25em 0 !important;
    }
    .wmde-markdown ul ul {
        list-style-type: circle !important;
    }
    .wmde-markdown ul ul ul {
        list-style-type: square !important;
    }
    .wmde-markdown h1 {
        font-size: 1.5em !important;
        font-weight: bold !important;
        margin: 0.5em 0 !important;
    }
    .wmde-markdown h2 {
        font-size: 1.3em !important;
        font-weight: bold !important;
        margin: 0.5em 0 !important;
    }
    .wmde-markdown h3 {
        font-size: 1.1em !important;
        font-weight: bold !important;
        margin: 0.5em 0 !important;
    }
    .wmde-markdown strong {
        font-weight: bold !important;
    }
    .wmde-markdown em {
        font-style: italic !important;
    }
    .wmde-markdown code {
        background-color: rgba(0,0,0,0.05) !important;
        padding: 0.2em 0.4em !important;
        border-radius: 3px !important;
        font-family: monospace !important;
    }
    .wmde-markdown blockquote {
        border-left: 4px solid #ddd !important;
        padding-left: 1em !important;
        margin-left: 0 !important;
        color: #666 !important;
    }
    .wmde-markdown p {
        margin: 0.5em 0 !important;
    }
`

interface MarkdownPreviewProps {
    content: string
    className?: string
}

export default function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
    if (!content) return null
    
    return (
        <div data-color-mode="light" className={className}>
            <style>{customStyles}</style>
            <MDPreview source={content} />
        </div>
    )
}
