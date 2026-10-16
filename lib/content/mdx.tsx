import "server-only";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import type { MDXComponents } from "mdx/types";

/** Compiles a project's MDX body at build time (pages are static). */
export async function renderMdx(source: string, components: MDXComponents) {
  const { default: Content } = await evaluate(source, { ...runtime, development: false });
  return <Content components={components} />;
}
