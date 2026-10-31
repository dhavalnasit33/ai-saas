export const DUMMY_TEMPLATES = {
  welcome: {
    type: "doc",
    content: [
      // 1. Title
      {
        type: "heading",
        attrs: { level: 1 },
        content: [
          {
            type: "text",
            text: "✨ Welcome to OneChat AI Workspace",
            marks: [{ type: "bold" }],
          },
        ],
      },
      // Subtitle
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Your personal space to write, create, organize, and save your content — all in one place.",
            marks: [{ type: "italic" }],
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Workspace is your personal document editor inside OneChat AI. Whether you're writing an article, taking notes, organizing ideas, or saving useful AI-generated responses, Workspace helps you keep everything together and easily accessible.",
          },
        ],
      },
      { type: "horizontalRule" },

      // 2. What Can You Do with Workspace?
      {
        type: "heading",
        attrs: { level: 2 },
        content: [
          {
            type: "text",
            text: "🚀 What Can You Do with Workspace?",
            marks: [{ type: "bold" }],
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "📝 Create & Edit Documents" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Write articles, notes, reports, ideas, and other documents using our built-in editor. Format your content with headings, lists, tables, images, and more.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "✨ Save AI-Generated Content" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Save useful AI responses and generated writing directly from supported OneChat AI tools. Return to your saved content whenever you need it.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "📁 Organize Your Work" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Create multiple pages to keep your documents, notes, and saved content organized in one convenient place.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "🌐 Share Your Documents" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Share your documents publicly using the Share feature, making it easy for others to view your work.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "📤 Export Your Content" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Export your documents to PDF, Microsoft Word, or Google Docs.",
          },
        ],
      },
      { type: "horizontalRule" },

      // 3. Frequently Asked Questions
      {
        type: "heading",
        attrs: { level: 2 },
        content: [
          {
            type: "text",
            text: "❓ Frequently Asked Questions",
            marks: [{ type: "bold" }],
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "1. What can I create in Workspace?",
            marks: [{ type: "bold" }],
          },
          { type: "hardBreak" },
          {
            type: "text",
            text: "You can create notes, articles, reports, documents, and other written content. You can also save AI-generated responses and writing from OneChat AI.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "2. Can I add images to my documents?",
            marks: [{ type: "bold" }],
          },
          { type: "hardBreak" },
          {
            type: "text",
            text: "Yes! You can add images alongside your text, tables, lists, and other content.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "3. Can I share my documents publicly?",
            marks: [{ type: "bold" }],
          },
          { type: "hardBreak" },
          {
            type: "text",
            text: "Yes! Use the Share button to share your documents publicly with others.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "4. Can I export my documents?",
            marks: [{ type: "bold" }],
          },
          { type: "hardBreak" },
          {
            type: "text",
            text: "Yes! Workspace supports exporting to PDF, Microsoft Word, and Google Docs.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "5. Can I edit AI-generated content I've saved?",
            marks: [{ type: "bold" }],
          },
          { type: "hardBreak" },
          {
            type: "text",
            text: "Absolutely! You can edit, format, and organize saved AI-generated content just like any other document.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "6. How do I create a new document?",
            marks: [{ type: "bold" }],
          },
          { type: "hardBreak" },
          {
            type: "text",
            text: "Click + Add a page in the left sidebar to create a new document and start writing.",
          },
        ],
      },
      { type: "horizontalRule" },

      // 4. Getting Started with the Editor
      {
        type: "heading",
        attrs: { level: 2 },
        content: [
          {
            type: "text",
            text: "✍️ Getting Started with the Editor",
            marks: [{ type: "bold" }],
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Workspace includes a powerful document editor. Here are a few simple things you can try.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "1. Start Writing" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Click anywhere in your document and begin typing.\nYou can write notes, articles, ideas, reports, or anything else you'd like to save.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "2. Format Your Text" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Select any text to reveal the floating formatting toolbar.\nYou can make text bold, italic, add links, highlight important information, and more.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "3. Try Markdown & Slash Commands" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Workspace supports common Markdown shortcuts:",
          },
        ],
      },
      {
        type: "codeBlock",
        content: [
          {
            type: "text",
            text: "# Headings\n- Lists\n> Quotes\n`Inline code`",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Or type / to open the command menu and discover formatting options, content blocks, and other features.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "4. Use AI to Improve Your Writing ✨" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Need a spark?\nType /ask ai to open the AI Assistant, or select text and choose Improve.\nUse AI to help refine your writing and get useful suggestions.",
          },
        ],
      },
      { type: "horizontalRule" },

      // 5. Try Interactive Tables (TABLE NODE)
      {
        type: "heading",
        attrs: { level: 2 },
        content: [
          {
            type: "text",
            text: "📊 Try Interactive Tables",
            marks: [{ type: "bold" }],
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Workspace supports editable tables to help organize your information.\nYou can add rows and columns, format cells, rearrange information, and merge cells.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Here's a simple example you can experiment with:",
          },
        ],
      },
      {
        type: "table",
        content: [
          // Header Row
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Task", marks: [{ type: "bold" }] }],
                  },
                ],
              },
              {
                type: "tableHeader",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Category", marks: [{ type: "bold" }] }],
                  },
                ],
              },
              {
                type: "tableHeader",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Priority", marks: [{ type: "bold" }] }],
                  },
                ],
              },
              {
                type: "tableHeader",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Status", marks: [{ type: "bold" }] }],
                  },
                ],
              },
            ],
          },
          // Row 1
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Write an article" }] }],
              },
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Writing" }] }],
              },
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "High" }] }],
              },
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "In Progress" }] }],
              },
            ],
          },
          // Row 2
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Review AI responses" }] }],
              },
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Research" }] }],
              },
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Medium" }] }],
              },
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Pending" }] }],
              },
            ],
          },
          // Row 3
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Prepare a report" }] }],
              },
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Work" }] }],
              },
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "High" }] }],
              },
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Completed" }] }],
              },
            ],
          },
          // Row 4
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Organize project notes" }] }],
              },
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Personal" }] }],
              },
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Low" }] }],
              },
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Pending" }] }],
              },
            ],
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Try editing the information above or adding another row.",
            marks: [{ type: "italic" }],
          },
        ],
      },
      { type: "horizontalRule" },

      // 6. Your First Workspace Checklist
      {
        type: "heading",
        attrs: { level: 2 },
        content: [
          {
            type: "text",
            text: "✅ Your First Workspace Checklist",
            marks: [{ type: "bold" }],
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Get familiar with Workspace by completing these simple activities:",
          },
        ],
      },
      {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Read the Workspace introduction" }] }],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Create your first page" }] }],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Write a few sentences" }] }],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Try a slash command (/)" }] }],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Use the floating formatting toolbar" }] }],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Try the AI Assistant" }] }],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Edit the sample table" }] }],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Add an image to your document" }] }],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Try sharing or exporting a document" }] }],
          },
        ],
      },
      { type: "horizontalRule" },

      // 7. Ready to Make Workspace Yours?
      {
        type: "heading",
        attrs: { level: 2 },
        content: [
          {
            type: "text",
            text: "🎉 Ready to Make Workspace Yours?",
            marks: [{ type: "bold" }],
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Now that you've explored the basics, you're ready to start creating!\nClick + Add a page in the sidebar to create your first document, or save useful content directly from supported OneChat AI tools.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Write. Create. Save. Organize. All in OneChat AI.",
            marks: [{ type: "bold" }],
          },
        ],
      },
      {
        type: "paragraph",
      },
    ],
  },
};