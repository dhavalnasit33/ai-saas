export const DUMMY_TEMPLATES = {
  welcome: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1, textAlign: "center" },
        content: [
          {
            type: "text",
            text: "Content Template",
            marks: [{ type: "bold" }],
          },
        ],
      },
      // Added extra space below the heading
      {
        type: "paragraph",
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This page is a ",
          },
          {
            type: "text",
            text: "sample template designed to demonstrate how you can save and organize your content inside OneChat AI.",
            marks: [{ type: "bold" }],
          },
          {
            type: "text",
            text: " The text shown here is only placeholder content, similar to “Lorem Ipsum,” and is meant to illustrate the format of a typical page. Here you can save your actual notes, ideas, wikis, research, AI responses, and much more..",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "The purpose of this feature is to help you keep information clear, structured, and easy to manage inside OneChat AI. This editor allows you to create rich, organized documents where you can store notes, research, AI responses, ideas, and collaborative content in one place. You can format text, structure information, and build documents just like a modern workspace editor.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This feature includes powerful tools such as:",
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Share pages with friends, teammates, or collaborators",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Create tables to organize data and information",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Mention users or pages using @mentions",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Format content with headings, lists, quotes, and highlights",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Embed images, links, and other content",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Collaborate and edit documents in real time",
                  },
                ],
              },
            ],
          },
        ],
      },
      // Added empty new line at the end to trigger the '/' command placeholder
      {
        type: "paragraph",
      },
    ],
  },
};
