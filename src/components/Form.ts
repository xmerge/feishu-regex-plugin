export const syntaxReferenceList = [
    {
      "syntax": ".",
      "desc": " 除换行符以外的所有字符。"
    },
    {
      "syntax": "^",
      "desc": " 字符串开头。"
    },
    {
      "syntax": "$",
      "desc": " 字符串结尾。"
    },
    {
      "syntax": "\\d, \\w, \\s",
      "desc": " 匹配数字、字符、空格。"
    },
    {
      "syntax": "\\D, \\W, \\S",
      "desc": " 匹配非数字、非字符、非空格。"
    },
    {
      "syntax": "[abc]",
      "desc": " 匹配 a、b 或 c 中的一个字母。"
    },
    {
      "syntax": "[az]",
      "desc": " 匹配 a 到 z 中的一个字母。"
    },
    {
      "syntax": "[^abc]",
      "desc": " 匹配除了 a、b 或 c 中的其他字母。"
    },
    {
      "syntax": "aa|bb",
      "desc": " 匹配 aa 或 bb。"
    },
    {
      "syntax": "?",
      "desc": " 0 次或 1 次匹配。"
    },
    {
      "syntax": "*",
      "desc": " 匹配 0 次或多次。"
    },
    {
      "syntax": "+",
      "desc": " 匹配 1 次或多次。"
    },
    {
      "syntax": "{n}",
      "desc": " 匹配 n 次。"
    },
    {
      "syntax": "{n,}",
      "desc": " 匹配 n 次以上。"
    },
    {
      "syntax": "{m,n}",
      "desc": " 最少 m 次，最多 n 次匹配。"
    },
    {
      "syntax": "(expr)",
      "desc": " 捕获 expr 子模式，以 \\1 使用它。"
    },
    {
      "syntax": "(?:expr)",
      "desc": " 忽略捕获的子模式。"
    },
    {
      "syntax": "(?=expr)",
      "desc": " 正向预查模式 expr。"
    },
    {
      "syntax": "(?!expr)",
      "desc": " 负向预查模式 expr。"
    }
  ]