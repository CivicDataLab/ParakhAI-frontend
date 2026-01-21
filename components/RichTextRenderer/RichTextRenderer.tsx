"use client";

import React from "react";

interface RichTextRendererProps {
  content: string;
  className?: string;
}

const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  content,
  className = "",
}) => {
  return (
    <div className={`rich-text-content ${className}`}>
      <div
        className="ql-editor"
        dangerouslySetInnerHTML={{ __html: content || "" }}
      />
      <style jsx global>{`
        .ql-editor {
          box-sizing: border-box;
          line-height: 1.42;
          height: 100%;
          outline: none;
          overflow-y: auto;
          padding: 12px 15px;
          tab-size: 4;
          -moz-tab-size: 4;
          text-align: left;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .ql-editor p,
        .ql-editor ol,
        .ql-editor ul,
        .ql-editor pre,
        .ql-editor blockquote,
        .ql-editor h1,
        .ql-editor h2,
        .ql-editor h3,
        .ql-editor h4,
        .ql-editor h5,
        .ql-editor h6 {
          margin: 0;
          padding: 0;
          counter-reset: list-1 list-2 list-3 list-4 list-5 list-6 list-7 list-8
            list-9;
        }
        .ql-editor ol,
        .ql-editor ul {
          padding-left: 1.5em;
          margin-bottom: 1em;
        }
        .ql-editor ol > li {
          list-style-type: decimal;
        }
        .ql-editor ul > li {
          list-style-type: disc;
        }
        .ql-editor li {
          margin-bottom: 0.5em;
        }
        .ql-editor h1 {
          font-size: 2em;
          font-weight: bold;
          margin-bottom: 0.5em;
        }
        .ql-editor h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-bottom: 0.5em;
        }
        .ql-editor h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin-bottom: 0.5em;
        }
        .ql-editor a {
          color: #06c;
          text-decoration: underline;
        }
        .ql-editor blockquote {
          border-left: 4px solid #ccc;
          margin-bottom: 5px;
          margin-top: 5px;
          padding-left: 16px;
        }
        .ql-editor code {
          background-color: #f0f0f0;
          border-radius: 3px;
          font-size: 85%;
          padding: 2px 4px;
        }
        .rich-text-content .ql-editor {
          padding: 0;
          font-size: 16px;
          line-height: 1.6;
        }
        .rich-text-content .ql-editor p {
          margin-bottom: 1em;
        }
      `}</style>
    </div>
  );
};

export default RichTextRenderer;
