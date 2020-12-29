const postcss = require('postcss')
const safe = require('postcss-safe-parser')
const camelCase = require('camelcase')

const isNumeric = x => (!isNaN(x))
const quasiRegex = /QUASI_EXPR_(\d+)___/g
const expressionPlaceholder = index => ('QUASI_EXPR_' + index + '___')

const nodeTagOptions = [ 'reStyle', 'reInline', false ]

const dataFromNodeType = (t, node, nodeExprs) => {
  switch(node.type){
    case 'decl': {
      const value = node.important ? `${node.value} !important` : node.value
      return [
        node.prop,
        buildInterpolatedAst(t, value, nodeExprs)[0]
      ]
    }
    case 'rule': {
      return [
        node.selector,
        buildObjectAst(t, node.nodes, nodeExprs)
      ]
    }
    case 'atrule': {
      return [
        `@${node.name} ${node.params}`,
        buildObjectAst(t, node.nodes, nodeExprs)
      ]
    }
  }
}

const buildObjectAst = (t, nodes, nodeExprs) => {
  const properties = nodes.map(node => {
    const [key, valueExpr] = dataFromNodeType(t, node, nodeExprs)
    let [keyExpr, computed] = buildInterpolatedAst(t, key, nodeExprs)

    node.type == 'decl' &&
      !computed &&
      t.isStringLiteral(keyExpr) &&
      (keyExpr = t.identifier(camelCase(keyExpr.value)))

    return t.objectProperty(keyExpr, valueExpr, computed)
  })

  return t.objectExpression(properties)
}

const getQuasisValue = (t, quasis) => {
  return isNumeric(quasis[0])
    ? [t.numericLiteral(+quasis[0]), false]
    : [t.stringLiteral(quasis[0]), false]
}

const buildInterpolatedAst = (t, value, nodeExprs) => {
  const { quasis, exprs } = splitExpressions(value)

  return quasis.length == 2 && quasis[0].length == 0 && quasis[1].length == 0
    ? [nodeExprs[exprs[0]], true]
    : quasis.length == 1
      ? getQuasisValue(t, quasis)
      : (() => {
          const quasisAst = buildQuasisAst(t, quasis)
          const exprsAst = exprs.map(exprIndex => nodeExprs[exprIndex])

          return [t.templateLiteral(quasisAst, exprsAst), true]
        })()
}

const handlePlugin = pluginArg => {
  return Array.isArray(pluginArg)
    ? require(pluginArg[0]).apply(null, pluginArg.slice(1))
    : typeof pluginArg === 'string'
      ? require(pluginArg)
      : pluginArg
}

const buildQuasisAst = (t, quasis) => {
  return quasis.map((quasi, i) => {
    const isTail = i === quasis.length - 1

    return t.templateElement({
      raw: quasi,
      cooked: quasi
    }, isTail)

  })
}

const splitExpressions = css => {
  let found, matches = []

  while (found = quasiRegex.exec(css))
    matches.push(found)

  const reduction = matches.reduce((acc, match) => {
    acc.quasis.push(css.substring(acc.prevEnd, match.index))
    const [placeholder, exprIndex] = match
    acc.exprs.push(exprIndex)
    acc.prevEnd = match.index + placeholder.length

    return acc
  }, {prevEnd: 0, quasis: [], exprs: []})

  reduction.quasis.push(css.substring(reduction.prevEnd, css.length))

  return reduction
}

module.exports = ({types: t}) => {
  return {
    visitor: {
      TaggedTemplateExpression(path, state) {
        state.opts.method &&
          !nodeTagOptions.includes(state.opts.method)
          nodeTagOptions.push(state.opts.method)

        if(!nodeTagOptions.includes(path.node.tag.name))
          return false

        const nodeQuasis = path.node.quasi.quasis
        const nodeExprs = path.node.quasi.expressions

        const css = nodeQuasis.reduce((acc, quasi, i) => {
          const expr = nodeExprs[i] ? expressionPlaceholder(i) : ''
          return acc + quasi.value.raw + expr
        }, '')

        const pluginsOpts = state.opts.plugins || []

        const plugins = pluginsOpts.map(handlePlugin)
        const processed = postcss(plugins)
          .process(css, {parser: safe, from: this.file.opts.filename}).root

        const objectExpression = buildObjectAst(t, processed.nodes, nodeExprs)

        path.node.tag.name === 'reInline' || state.opts.method === false
          ? path.replaceWith(objectExpression)
          : path.replaceWith(
              t.callExpression(
                t.identifier(state.opts.method || 'reStyle'),
                [objectExpression]
              )
            )
      }
    }
  }
}