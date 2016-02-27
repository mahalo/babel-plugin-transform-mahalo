# babel-plugin-access



## Installation

```sh
$ npm install babel-plugin-access
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
    "plugins": ["access"]
}
```

### Via CLI

```sh
$ babel --plugins access script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
    plugins: ["access"]
});
```
