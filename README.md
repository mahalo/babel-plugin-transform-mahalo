# babel-plugin-transform-mahalo



## Installation

```sh
$ npm install babel-plugin-transform-mahalo
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
    "plugins": ["transform-mahalo"]
}
```

### Via CLI

```sh
$ babel --plugins transform-mahalo script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
    plugins: ["transform-mahalo"]
});
```
