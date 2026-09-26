#!/usr/bin/env python3
"""
Tiny SCSS -> CSS compiler.

Only the subset of Sass used in this project is supported:
  - $variables and simple var() maps
  - nesting (including & parent-selector references)
  - @import "partial"  (resolves to _partial.scss in the same folder, inlined)
  - @media nesting inside selectors
  - // and /* */ comments

This exists only because this sandbox has no network access to install a
real Sass compiler (npm/pip/apt registries are all blocked here). The .scss
source files are written as plain, standard Sass and will compile the same
way with the official `sass` CLI if you ever run `sass main.scss style.css`
in a normal environment.
"""
import re
import sys
from pathlib import Path

SCSS_DIR = Path(__file__).parent
OUT_FILE = Path(__file__).parent.parent / "web" / "assets" / "style.css"


def strip_comments(text):
    text = re.sub(r"//[^\n]*", "", text)
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return text


def resolve_imports(text, base_dir, seen=None):
    if seen is None:
        seen = set()

    def repl(m):
        name = m.group(1)
        candidates = [
            base_dir / f"_{name}.scss",
            base_dir / f"{name}.scss",
            base_dir / f"_{name}.css",
        ]
        for c in candidates:
            if c.exists():
                if c in seen:
                    return ""
                seen.add(c)
                inner = c.read_text()
                inner = strip_comments(inner)
                return resolve_imports(inner, base_dir, seen)
        raise FileNotFoundError(f"Could not resolve @import '{name}'")

    return re.sub(r'@import\s+["\']([^"\']+)["\']\s*;', repl, text)


def extract_variables(text):
    variables = {}
    def repl(m):
        variables[m.group(1)] = m.group(2).strip()
        return ""
    # only top-level-ish variable defs: $name: value;
    text = re.sub(r"\$([a-zA-Z0-9_-]+)\s*:\s*([^;]+);", repl, text)
    return text, variables


def resolve_interpolation(text, variables):
    """Defensive: turn any stray #{$var} interpolation into a plain
    substitution so a leftover #{...} can never corrupt brace matching
    downstream. Plain `$var` substitution (see substitute_variables)
    handles the normal case; this is just a safety net."""
    def repl(m):
        inner = m.group(1).strip()
        if inner.startswith("$") and inner[1:] in variables:
            return variables[inner[1:]]
        return inner
    return re.sub(r"#\{([^}]*)\}", repl, text)


def substitute_variables(text, variables):
    # repeat substitution passes to allow variables referencing variables
    for _ in range(5):
        changed = False

        def repl(m):
            nonlocal changed
            name = m.group(1)
            if name in variables:
                changed = True
                return variables[name]
            return m.group(0)

        new_text = re.sub(r"\$([a-zA-Z0-9_-]+)", repl, text)
        text = new_text
        if not changed:
            break
    return text


def tokenize_blocks(css):
    """Parse into a tree of (selector, body_text, [children]) using brace matching."""
    pos = 0
    length = len(css)
    root = []
    stack = [root]
    buf = ""
    selector_stack = []
    i = 0
    while i < length:
        ch = css[i]
        if ch == "{":
            selector = buf.strip()
            buf = ""
            node = {"selector": selector, "decls": [], "children": []}
            stack[-1].append(node)
            stack.append(node["children"])
            selector_stack.append(node)
        elif ch == "}":
            text = buf.strip()
            buf = ""
            if selector_stack:
                node = selector_stack.pop()
                if text:
                    node["decls"].append(text)
                stack.pop()
        elif ch == ";":
            buf += ch
            stmt = buf.strip()
            buf = ""
            if stmt and stmt != ";":
                if stack[-1] is root:
                    pass  # stray top-level declaration, ignore
                else:
                    selector_stack[-1]["decls"].append(stmt)
        else:
            buf += ch
        i += 1
    return root


def join_selector(parent, child):
    parts_parent = [p.strip() for p in parent.split(",")] if parent else [""]
    parts_child = [p.strip() for p in child.split(",")]
    out = []
    for pp in parts_parent:
        for pc in parts_child:
            if "&" in pc:
                out.append(pc.replace("&", pp))
            elif pp == "":
                out.append(pc)
            else:
                out.append(f"{pp} {pc}")
    return ", ".join(out)


def render(nodes, parent_selector="", is_media=False, media_query=""):
    css_out = []
    for node in nodes:
        sel = node["selector"]
        if sel.startswith("@keyframes"):
            # keyframe steps (0%, 50%, from/to) are literal, never joined
            # to an outer selector
            inner = render(node["children"], "")
            css_out.append(f"{sel} {{\n{inner}\n}}")
            continue
        if sel.startswith("@media"):
            inner_parts = []
            decls = [d if d.endswith(";") else d + ";" for d in node["decls"]]
            if decls and parent_selector:
                inner_parts.append(parent_selector + " {\n  " + "\n  ".join(decls) + "\n}")
            child_css = render(node["children"], parent_selector)
            if child_css:
                inner_parts.append(child_css)
            inner = "\n\n".join(inner_parts)
            css_out.append(f"{sel} {{\n{inner}\n}}")
            continue
        full_sel = join_selector(parent_selector, sel) if parent_selector else sel
        decls = [d if d.endswith(";") else d + ";" for d in node["decls"]]
        if decls:
            css_out.append(full_sel + " {\n  " + "\n  ".join(decls) + "\n}")
        if node["children"]:
            css_out.append(render(node["children"], full_sel))
    return "\n\n".join(css_out)


def compile_scss(entry="main.scss"):
    entry_path = SCSS_DIR / entry
    text = entry_path.read_text()
    text = strip_comments(text)
    text = resolve_imports(text, SCSS_DIR)
    text = strip_comments(text)
    text, variables = extract_variables(text)
    text = resolve_interpolation(text, variables)
    text = substitute_variables(text, variables)
    tree = tokenize_blocks(text)
    css = render(tree)
    css = re.sub(r"\n{3,}", "\n\n", css).strip() + "\n"
    return css


def main():
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    css = compile_scss()
    OUT_FILE.write_text(css)
    print(f"Compiled {OUT_FILE} ({len(css)} bytes)")


if __name__ == "__main__":
    main()
