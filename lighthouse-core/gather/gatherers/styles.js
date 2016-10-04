/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Gathers the active style and stylesheets used on a page.
 * "Active" means that if the stylesheet is removed at a later time
 * (before endStylesCollect is called), this gatherer will not include it.
 */

'use strict';

const WebInspector = require('../../lib/web-inspector');
const Gatherer = require('./gatherer');

/**
 * @param {!Artifacts} parseTree
 * @return {!Array}
 */
function getCSSPropsInStyleSheet(parseTree) {
  let results = [];

  parseTree.traverseByType('declaration', function(node, index, parent) {
    const [name, val] = node.toString().split(':').map(item => item.trim());
    results.push({
      property: {name, val},
      declarationRange: node.declarationRange,
      selector: parent.selectors.toString()
    });
  });

  return results;
}

class Styles extends Gatherer {

  constructor() {
    super();
    this._activeStyles = [];
    this._onStyleSheetAdded = this.onStyleSheetAdded.bind(this);
    this._onStyleSheetRemoved = this.onStyleSheetRemoved.bind(this);
  }

  onStyleSheetAdded(styleHeader) {
    // Exclude stylesheets "injected" by extensions or ones that were added by
    // users using the "inspector".
    if (styleHeader.header.origin !== 'regular') {
      return;
    }

    const parser = new WebInspector.SCSSParser();

    this.driver.sendCommand('CSS.getStyleSheetText', {
      styleSheetId: styleHeader.header.styleSheetId
    }).then(content => {
      styleHeader.content = content.text;
      styleHeader.parsedContent = getCSSPropsInStyleSheet(
          parser.parse(styleHeader.content, {syntax: 'css'}));
      this._activeStyles.push(styleHeader);
    });
  }

  onStyleSheetRemoved(styleHeader) {
    for (let i = 0; i < this._activeStyles.length; ++i) {
      const header = this._activeStyles[i].header;
      if (header.styleSheetId === styleHeader.styleSheetId) {
        this._activeStyles.splice(i, 1);
        break;
      }
    }
  }

  beginStylesCollect(opts) {
    this.driver = opts.driver;
    this.driver.sendCommand('DOM.enable');
    this.driver.sendCommand('CSS.enable');
    this.driver.on('CSS.styleSheetAdded', this._onStyleSheetAdded);
    this.driver.on('CSS.styleSheetRemoved', this._onStyleSheetRemoved);
  }

  endStylesCollect() {
    return new Promise((resolve, reject) => {
      if (!this.driver || !this._activeStyles.length) {
        reject('No active stylesheets were collected.');
        return;
      }

      this.driver.off('CSS.styleSheetAdded', this._onStyleSheetAdded);
      this.driver.off('CSS.styleSheetRemoved', this._onStyleSheetRemoved);
      this.driver.sendCommand('CSS.disable');

      resolve(this._activeStyles);
    });
  }

  beforePass(options) {
    this.beginStylesCollect(options);
  }

  afterPass() {
    return this.endStylesCollect()
      .then(stylesheets => {
        // Want unique stylesheets. Remove those with the same text content.
        // An example where stylesheets are the same is if the user includes a
        // stylesheet more than once (these have unique stylesheet ids according to
        // the DevTools protocol). Another example is many instances of a shadow
        // root that share the same <style> tag.
        const map = new Map(stylesheets.map(s => [s.content, s]));
        this.artifact = Array.from(map.values());
      }, _ => {
        this.artifact = -1;
        return;
      });
  }
}

module.exports = Styles;
