const json = {
  hello: "world",
  hi: {
    world: "foo",
    is: true,
  },
  arr: [
    {
      field1: 123,
    },
  ],
  numArr: [123],
};

const utcRE = /(\d{4})-(\d{2})-(\d{2})T(\d{2})\:(\d{2})\:(\d{2})[+-](\d{2})\:(\d{2})/;
const uuidRE = /^[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;
const uriRE = /^(http|https)/;

/**
 *
 * @param {string} val
 */
const reFormatMatcher = (val) => {
  if (val.match(utcRE)) {
    return { format: "date-time" };
  } else if (val.match(uuidRE)) {
    return { format: "uuid" };
  } else if (val.match(uriRE)) {
    return { format: "uri" };
  }

  return {};
};

const stringExpander = (key, val) => {
  return {
    [key]: { type: "string", ...reFormatMatcher(val) },
  };
};

const jsonSchemaExpander = ([key, val]) => {
  if (val === null || val === undefined) {
    return { [key]: { type: "null" } };
  } else if (val instanceof Array) {
    return { [key]: { type: "array", items: expandArray(val[0]) } };
  } else if (typeof val === "object") {
    return { [key]: iterateObject(val) };
  } else if (typeof val === "string") {
    return stringExpander(key, val);
  } else if (typeof val === "number") {
    return { [key]: { type: "number" } };
  } else if (typeof val === "boolean") {
    return { [key]: { type: "boolean" } };
  } else {
    console.warn("UNHANDLED DATA TYPE - CHECK SCHEMA FOR ERRORS");
    return {};
  }
};

const expandArray = (arrItem) => {
  if (typeof arrItem === "object") {
    return iterateObject(arrItem);
  } else if (typeof arrItem === "string") {
    return { type: "string", ...reFormatMatcher(arrItem) };
  } else if (typeof arrItem === "number") {
    return { type: "number" };
  } else if (arrItem === null || arrItem === undefined) {
    return { type: "null" };
  } else if (typeof val === "boolean") {
    return { type: "boolean" };
  } else {
    throw new Error("Unhandled item type");
  }
};

const iterateObject = (o) => {
  if (o instanceof Array) {
    return { type: "array", items: expandArray(o[0]) };
  } else if (typeof o !== "object") {
    throw new Error("Only objects at this level");
  } else {
    return {
      type: "object",
      properties: Object.entries(o)
        .map(jsonSchemaExpander)
        .reduce((a, o) => {
          return { ...a, ...o };
        }, {}),
    };
  }
};

const fs = require("fs");

fs.writeFileSync(
  "test-json-schema.json",
  JSON.stringify(iterateObject(json), null, 2)
);
