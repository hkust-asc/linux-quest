const operator = /^(2>|>>|[|>])/;

export function tokenize(input, { partial = false } = {}) {
  const tokens = [];
  let index = 0;
  while (index < input.length) {
    if (/\s/.test(input[index])) {
      index++;
      continue;
    }
    const start = index;
    const op = input.slice(index).match(operator)?.[0];
    if (op) {
      index += op.length;
      tokens.push({ type: "operator", value: op, start, end: index });
      continue;
    }
    const segments = [];
    let quote = "";
    let segment;
    while (index < input.length) {
      const char = input[index];
      if (!quote && /[\s|>]/.test(char)) break;
      index++;
      if (char === "\\" && quote !== "'" && index < input.length) {
        segments.push({ text: input[index++], expand: false });
        segment = undefined;
      } else if (char === quote) {
        quote = "";
        segment = undefined;
      } else if (!quote && (char === '"' || char === "'")) {
        quote = char;
        segment = undefined;
      } else {
        if (!segment) {
          segment = { text: "", expand: quote !== "'" };
          segments.push(segment);
        }
        segment.text += char;
      }
    }
    if (quote && !partial) throw new Error("unclosed quote");
    tokens.push({ type: "word", value: segments.map(segment => segment.text).join(""), segments, start, end: index });
  }
  return tokens;
}

export function expandWord(token, env) {
  return token.segments.map(({ text, expand }) => expand
    ? text.replace(/\$\{([a-z_]\w*)\}|\$([a-z_]\w*)/gi, (_, braced, bare) => Object.hasOwn(env, braced ?? bare) ? env[braced ?? bare] : "")
    : text).join("");
}

export function parseFlags(args) {
  const flags = new Set();
  const operands = [];
  let options = true;
  for (const arg of args) {
    if (options && arg === "--") options = false;
    else if (options && arg.startsWith("--")) flags.add(arg.slice(2));
    else if (options && /^-[a-z\d]+$/i.test(arg)) for (const flag of arg.slice(1)) flags.add(flag);
    else operands.push(arg);
  }
  return { flags, operands };
}

export function parse(input) {
  const tokens = tokenize(input);
  if (!tokens.length) return [];
  const stages = [{ words: [], redirects: [] }];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const stage = stages.at(-1);
    if (token.type === "word") stage.words.push(token);
    else if (token.value === "|") {
      if (stages.length === 2) throw new Error("only one pipe is supported");
      stages.push({ words: [], redirects: [] });
    } else {
      const target = tokens[++index];
      if (target?.type !== "word") throw new Error(`${token.value}: missing redirection target`);
      stage.redirects.push({ operator: token.value, target });
    }
  }
  if (stages.some(stage => !stage.words.length)) throw new Error("missing command");
  return stages;
}
