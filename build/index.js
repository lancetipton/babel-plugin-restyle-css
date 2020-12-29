"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var postcss = require('postcss');

var safe = require('postcss-safe-parser');

var camelCase = require('camelcase');

var isNumeric = function isNumeric(x) {
  return !isNaN(x);
};

var quasiRegex = /QUASI_EXPR_(\d+)___/g;

var expressionPlaceholder = function expressionPlaceholder(index) {
  return 'QUASI_EXPR_' + index + '___';
};

var dataFromNodeType = function dataFromNodeType(t, node, nodeExprs) {
  switch (node.type) {
    case 'decl':
      {
        var value = node.important ? "".concat(node.value, " !important") : node.value;
        return [node.prop, buildInterpolatedAst(t, value, nodeExprs)[0]];
      }

    case 'rule':
      {
        return [node.selector, buildObjectAst(t, node.nodes, nodeExprs)];
      }

    case 'atrule':
      {
        return ["@".concat(node.name, " ").concat(node.params), buildObjectAst(t, node.nodes, nodeExprs)];
      }
  }
};

var buildObjectAst = function buildObjectAst(t, nodes, nodeExprs) {
  var properties = nodes.map(function (node) {
    var _dataFromNodeType = dataFromNodeType(t, node, nodeExprs),
        _dataFromNodeType2 = _slicedToArray(_dataFromNodeType, 2),
        key = _dataFromNodeType2[0],
        valueExpr = _dataFromNodeType2[1];

    var _buildInterpolatedAst = buildInterpolatedAst(t, key, nodeExprs),
        _buildInterpolatedAst2 = _slicedToArray(_buildInterpolatedAst, 2),
        keyExpr = _buildInterpolatedAst2[0],
        computed = _buildInterpolatedAst2[1];

    node.type == 'decl' && !computed && t.isStringLiteral(keyExpr) && (keyExpr = t.identifier(camelCase(keyExpr.value)));
    return t.objectProperty(keyExpr, valueExpr, computed);
  });
  return t.objectExpression(properties);
};

var getQuasisValue = function getQuasisValue(t, quasis) {
  return isNumeric(quasis[0]) ? [t.numericLiteral(+quasis[0]), false] : [t.stringLiteral(quasis[0]), false];
};

var buildInterpolatedAst = function buildInterpolatedAst(t, value, nodeExprs) {
  var _splitExpressions = splitExpressions(value),
      quasis = _splitExpressions.quasis,
      exprs = _splitExpressions.exprs;

  return quasis.length == 2 && quasis[0].length == 0 && quasis[1].length == 0 ? [nodeExprs[exprs[0]], true] : quasis.length == 1 ? getQuasisValue(t, quasis) : function () {
    var quasisAst = buildQuasisAst(t, quasis);
    var exprsAst = exprs.map(function (exprIndex) {
      return nodeExprs[exprIndex];
    });
    return [t.templateLiteral(quasisAst, exprsAst), true];
  }();
};

var handlePlugin = function handlePlugin(pluginArg) {
  return Array.isArray(pluginArg) ? require(pluginArg[0]).apply(null, pluginArg.slice(1)) : typeof pluginArg === 'string' ? require(pluginArg) : pluginArg;
};

var buildQuasisAst = function buildQuasisAst(t, quasis) {
  return quasis.map(function (quasi, i) {
    var isTail = i === quasis.length - 1;
    return t.templateElement({
      raw: quasi,
      cooked: quasi
    }, isTail);
  });
};

var splitExpressions = function splitExpressions(css) {
  var found,
      matches = [];

  while (found = quasiRegex.exec(css)) {
    matches.push(found);
  }

  var reduction = matches.reduce(function (acc, match) {
    acc.quasis.push(css.substring(acc.prevEnd, match.index));

    var _match = _slicedToArray(match, 2),
        placeholder = _match[0],
        exprIndex = _match[1];

    acc.exprs.push(exprIndex);
    acc.prevEnd = match.index + placeholder.length;
    return acc;
  }, {
    prevEnd: 0,
    quasis: [],
    exprs: []
  });
  reduction.quasis.push(css.substring(reduction.prevEnd, css.length));
  return reduction;
};

module.exports = function (_ref) {
  var t = _ref.types;
  return {
    visitor: {
      TaggedTemplateExpression: function TaggedTemplateExpression(path, state) {
        if (path.node.tag.name !== 'reStyle') return false;
        var nodeQuasis = path.node.quasi.quasis;
        var nodeExprs = path.node.quasi.expressions;
        var css = nodeQuasis.reduce(function (acc, quasi, i) {
          var expr = nodeExprs[i] ? expressionPlaceholder(i) : '';
          return acc + quasi.value.raw + expr;
        }, '');
        var pluginsOpts = state.opts.plugins || [];
        var plugins = pluginsOpts.map(handlePlugin);
        var processed = postcss(plugins).process(css, {
          parser: safe,
          from: this.file.opts.filename
        }).root;
        var objectExpression = buildObjectAst(t, processed.nodes, nodeExprs);
        path.replaceWith(objectExpression);
      }
    }
  };
};