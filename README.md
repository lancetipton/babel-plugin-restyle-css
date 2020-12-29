# babel-plugin-restyle-css

Babel plugin to convert reStyle css strings into JS objects durning build.
Code originally taken from [babel-plugin-css-to-js](https://github.com/jakecoxon/babel-plugin-css-to-js)
It was then modified to meet the needs of this library.
  * `css` prop was changed to `reStyle`
  * All dependencies were updated to the latest versions


### Install

**NPM**
```sh
npm install babel-plugin-restyle-css --save-dev
```

**Yarn**
```sh
yarn add babel-plugin-restyle-css --dev
```

**Before:**
```javascript
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

**After:**
```javascript
const rule = props => ({
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

**.babelrc**
```
{
  "plugins": [["restyle-css", {
    "plugins": ["autoprefixer"]
  }]]
}
```


