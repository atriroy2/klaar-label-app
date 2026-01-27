'use client'

import dynamic from 'next/dynamic'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

// Dynamically import to avoid SSR issues
const MDEditor = dynamic(
    () => import('@uiw/react-md-editor'),
    { ssr: false }
)

interface MarkdownEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    height?: number
    preview?: 'edit' | 'live' | 'preview'
}

// Custom styles to ensure proper markdown rendering in preview
const customStyles = `
    .w-md-editor-preview .wmde-markdown ul,
    .w-md-editor-preview .wmde-markdown ol {
        list-style-position: inside;
        padding-left: 1.5em;
    }
    .w-md-editor-preview .wmde-markdown ul {
        list-style-type: disc;
    }
    .w-md-editor-preview .wmde-markdown ol {
        list-style-type: decimal;
    }
    .w-md-editor-preview .wmde-markdown ul li,
    .w-md-editor-preview .wmde-markdown ol li {
        display: list-item;
        margin: 0.25em 0;
    }
    .w-md-editor-preview .wmde-markdown ul ul {
        list-style-type: circle;
    }
    .w-md-editor-preview .wmde-markdown ul ul ul {
        list-style-type: square;
    }
    .w-md-editor-preview .wmde-markdown h1,
    .w-md-editor-preview .wmde-markdown h2,
    .w-md-editor-preview .wmde-markdown h3 {
        font-weight: bold;
        margin: 0.5em 0;
    }
    .w-md-editor-preview .wmde-markdown h1 { font-size: 1.5em; }
    .w-md-editor-preview .wmde-markdown h2 { font-size: 1.3em; }
    .w-md-editor-preview .wmde-markdown h3 { font-size: 1.1em; }
    .w-md-editor-preview .wmde-markdown strong { font-weight: bold; }
    .w-md-editor-preview .wmde-markdown em { font-style: italic; }
    .w-md-editor-preview .wmde-markdown code {
        background-color: rgba(0,0,0,0.05);
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: monospace;
    }
    .w-md-editor-preview .wmde-markdown blockquote {
        border-left: 4px solid #ddd;
        padding-left: 1em;
        margin-left: 0;
        color: #666;
    }
`

export default function MarkdownEditor({ 
    value, 
    onChange, 
    placeholder,
    height = 300,
    preview = 'live'
}: MarkdownEditorProps) {
    return (
        <div data-color-mode="light" className="w-full">
            <style>{customStyles}</style>
            <MDEditor
                value={value}
                onChange={(val) => onChange(val || '')}
                preview={preview}
                height={height}
                textareaProps={{
                    placeholder: placeholder
                }}
            />
        </div>
    )
}
