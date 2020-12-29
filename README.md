# babel-plugin-restyle-css

Babel plugin to convert reStyle css strings into JS objects durning build.
<br/>
Code originally taken from [babel-plugin-css-to-js](https://github.com/jakecoxon/babel-plugin-css-to-js).
<br/>
It was then modified to meet the needs of this library.
  * `css` prop was changed to `reStyle`
  * All dependencies were updated to the latest versions


## Install

**NPM**
```sh
npm install babel-plugin-restyle-css --save-dev
```

**Yarn**
```sh
yarn add babel-plugin-restyle-css --dev
```

## Setup

Add it to your babel config ( `.babelrc` || `babel.config.js` )
```js
{
  "plugins": [["restyle-css"]]
}
```

**Post CSS Plugins**
It uses postCSS under the hood to do the CSS conversion. Which means any you can pass any postCSS plugins you want by adding them to the babel config

```js
{
  "plugins": [["restyle-css", {
    // Add PostCss Plugins ( optional )
    "plugins": ["autoprefixer"]
  }]]
}
```

**method**
By default the `reStyle` method will be used in transposed code. To modify the name of the method, use the method property in the babel config.
```js
{
  "plugins": [["restyle-css", {
    "method": 'customMethod'
  }]]
}
```
Setting the `method` property to `false` will omit the method call entirely. Use this to get just the converted style object. See example below for more info


## Examples

### Example 1
Basic setup with the `reStyle` method

**Babel config**
```js
{
  "plugins": [["restyle-css"]]
}
```

**In App**
*  Import the `reStyle` method at the top of your file, then use it when building your styles

```javascript
import { reStyle } from '@keg-hub/retheme/reStyle'

const rule = props => reStyle`
  font-size: ${props.fontSize}px;
  margin-top: ${props.margin ? '15px' : 0};
  color: red;
  line-height: 1.4;
  :hover {
    color: blue;
    fontSize: ${props.fontSize + 2}px;
  }
  @media (min-height: 300px) {
    background-color: gray;
    :hover {
      color: black;
    }
  }
`
```

**Build Output**
```javascript
const rule = props => reStyle({
  fontSize: props.fontSize + 'px',
  marginTop: props.margin ? '15px' : 0,
  color: 'red',
  lineHeight: 1.4,
  ':hover': {
    color: 'blue',
    fontSize: props.fontSize + 2 + 'px'
  },
  '@media (min-height: 300px)': {
    backgroundColor: 'gray',
    ':hover': {
      color: 'black'
    }
  }
})
```

### Example 2
With a custom method, which will overwrite the `reStyle` method in the build output

**Babel config**
```js
{
  "plugins": [["restyle-css", {
    "method": 'customMethod'
  }]]
}
```

**In App**
*  Import your `customMethod` method at the top of your file. You can use `reStyle` or `customMethod` when building your styles

```javascript
import { customMethod } from './path/to/custom/method'

// reStyle will be replaced by customMethod
const rule = props => reStyle`
  font-size: ${props.fontSize}px;
`
// Or use customMethod here directly
const rule = props => customMethod`
  font-size: ${props.fontSize}px;
`
```

**Build Output**
```javascript
const rule = props => customMethod({
  fontSize: props.fontSize + 'px'
})
```


### Example 3
With the `method` property set to `false` in the babel config.
> Works the same as the [babel-plugin-css-to-js](https://github.com/jakecoxon/babel-plugin-css-to-js) plugin

**Babel config**
```js
{
  "plugins": [["restyle-css", {
    "method": false
  }]]
}
```

**In App**
*  Still use `reStyle` when building your styles

```javascript
// reStyle will be removed by the plugin
const rule = props => reStyle`
  font-size: ${props.fontSize}px;
`
```

**Build Output**
```javascript
// The converted styles object will be returned, without a method call
const rule = props => ({
  fontSize: props.fontSize + 'px'
})
```

## Notes
You may have a need to convert styles inline of a `reStyle` definition. A helper tag has been added to allow this functionality. Similar to settng the `method` property to false. It will return the converted styles as an object.

**In App**
```js
const rule = props => reStyle`
  .inline-w-helper {
    composes: ${props.foo ? reInline`border: 1px` : undefined};
  }
`
```

**Build Output**
```js
const rule = props => reStyle({
  '.inline-w-helper': {
    composes: props.foo ? { border: "1px" } : undefined,
  }
})
```