# access-babel



## Installation

```sh
$ npm install access-babel
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
    "plugins": ["access-babel"]
}
```

### Via CLI

```sh
$ babel --plugins access-babel script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
    plugins: ["access-babel"]
});
```
