module.exports = {
    env: {
      node: true,
      browser: true,
      commonjs: true,
      es2021: true
    },
    extends: [
      'eslint:recommended'
    ],
    parserOptions: {
      ecmaVersion: 2022
    },
    rules: {
      // Possible Errors
      'no-console': 'off', // Allow console for this app
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'error',
  
      // Best Practices
      'curly': ['error', 'all'],
      'eqeqeq': ['error', 'always'],
      'no-caller': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-multi-spaces': 'error',
      'no-new-func': 'error',
      'no-return-assign': ['error', 'always'],
      'no-self-compare': 'error',
      'no-useless-call': 'error',
      'no-useless-return': 'error',
      
      // Variables
      'no-unused-vars': ['error', { 
        'vars': 'all', 
        'args': 'after-used',
        'ignoreRestSiblings': true,
        'argsIgnorePattern': '^_'
      }],
      'no-use-before-define': ['error', { 'functions': false }],
      
      // Stylistic Issues
      'array-bracket-spacing': ['error', 'never'],
      'block-spacing': ['error', 'always'],
      'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
      'comma-dangle': ['error', 'never'],
      'comma-spacing': ['error', { 'before': false, 'after': true }],
      'comma-style': ['error', 'last'],
      'indent': ['error', 2, { 'SwitchCase': 1 }],
      'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
      'keyword-spacing': ['error', { 'before': true, 'after': true }],
      'linebreak-style': ['error', 'unix'],
      'max-len': ['error', { 'code': 100, 'ignoreComments': true, 'ignoreUrls': true, 'ignoreStrings': true, 'ignoreTemplateLiterals': true }],
      'no-trailing-spaces': 'error',
      'object-curly-spacing': ['error', 'always'],
      'quotes': ['error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }],
      'semi': ['error', 'always'],
      'semi-spacing': ['error', { 'before': false, 'after': true }],
      'space-before-blocks': ['error', 'always'],
      'space-before-function-paren': ['error', { 'anonymous': 'always', 'named': 'never', 'asyncArrow': 'always' }],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      'space-unary-ops': ['error', { 'words': true, 'nonwords': false }],
  
      // ES6
      'arrow-parens': ['error', 'as-needed'],
      'arrow-spacing': ['error', { 'before': true, 'after': true }],
      'no-duplicate-imports': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'rest-spread-spacing': ['error', 'never'],
      'template-curly-spacing': ['error', 'never']
    },
    overrides: [
      {
        // For renderer process files that use ES modules
        files: ['src/renderer/**/*.js'],
        env: {
          browser: true,
          node: false
        },
        parserOptions: {
          sourceType: 'module',
          ecmaVersion: 2022
        }
      }
    ]
  };