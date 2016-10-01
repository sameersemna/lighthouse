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
 * @fileoverview Gathers a page's styles.
 */

'use strict';

const Gatherer = require('./gatherer');

// const MAX_WAIT_TIMEOUT = 1000;

class Styles extends Gatherer {

  constructor() {
    super();
    this._stylesRecorder = [];
    this._onStyleSheetAdded = this.onStyleSheetAdded.bind(this);
  }

  onStyleSheetAdded(stylesheet) {
    this._stylesRecorder.push(stylesheet);
  }

  beginStylesCollect(opts) {
    // return new Promise((resolve, reject) => {
    //   return opts.driver.sendCommand('DOM.enable')
    //       .then(opts.driver.sendCommand('CSS.enable'))
    //       .then(_ => {
    //         opts.driver.on('CSS.styleSheetAdded', this._onStyleSheetAdded);
    //       })
    //       .catch(reject);
    // });
    opts.driver.sendCommand('DOM.enable');
    opts.driver.sendCommand('CSS.enable');
    opts.driver.on('CSS.styleSheetAdded', this._onStyleSheetAdded);
  }

  endStylesCollect(opts) {
    return new Promise((resolve, reject) => {
      opts.driver.off('CSS.styleSheetAdded', this._onStyleSheetAdded);

      // Remove stylesheets "injected" by extension or added in the "inspector".
      const styleHeaders = this._stylesRecorder.filter(styleHeader => {
        return styleHeader.header.origin === 'regular';
      }).map(styleHeader => {
console.log(styleHeader.header.styleSheetId)
        return opts.driver.sendCommand('CSS.getStyleSheetText', {
          styleSheetId: styleHeader.header.styleSheetId
        });
      });

      return Promise.all(styleHeaders).then(results => {
        opts.driver.sendCommand('CSS.disable').then(_ => {
          resolve(results);
        }, reject);
      }, reject).catch(reject);
    });
  }

  beforePass(options) {
    this.beginStylesCollect(options);
  }

  afterPass(options) {
    return this.endStylesCollect(options)
      .then(stylesheets => {
        this.artifact = stylesheets;
      }, _ => {
        this.artifact = -1;
        return;
      });
  }
}

module.exports = Styles;
