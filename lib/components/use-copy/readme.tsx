import useCopy, { Copy } from "lib/somewhere";

const TestUsageExample = () => {
  const { text, somethingNested } = useCopy("content-reference", {
    text: "hello",
    somethingNested: {
      blabla: "hello",
      blabla2: {
        blabla3: "hello",
      },
    },
  });

  return (
    <div>
      <Copy>
        <div>{text}</div>
      </Copy>
      <Copy>
        <div>{somethingNested.blabla}</div>
      </Copy>
      <Copy>
        <div>{somethingNested.blabla2.blabla3}</div>
      </Copy>
    </div>
  );
};

// Copy component's only job is to make an inline editor ON the webpage that opens up a modal to edit the content, while highlighting the wrapped content.
// Every page that has "useCopy" should have an overview of all instances of "useCopy" on the page, and a button to view all of them at once
// Clicking "edit" highlights every instance of Copy on the page, and clicking it opens a modal to edit the content - JSON editor for now - and save button which writes to the local file system (as deterimned by some global config / provider context in the consumer) .
// Editing content OVERRIDES the hardcoded content in useCopy - so the hardcoded content is the "starting point" and editing content is the "override"
// Even for the hardcoded content, we want some way to output it as JSON
// Ideally all content is stored as JSON, but with a way to convert it to markdown and vice versa (or at least a RAG friendly AI format, because the markdown output is important for search)
// All data should be ready at build time, so we can statically build - ideally useCopy has two modes whether its a client component or a server component, so it can work in both contexts internally (idk how to do this, but ive seen it done before)
