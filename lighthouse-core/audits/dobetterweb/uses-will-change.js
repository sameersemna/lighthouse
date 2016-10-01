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
 * @fileoverview Audit a page to see if it should be using will-change.
 */

'use strict';

const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

class WillChangeAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'CSS',
      name: 'uses-will-change',
      description: 'Site should use CSS will-change',
      helpText: 'Consider using CSS <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/will-change" target="_blank">will-change</a>, which provides hints that an element will change. The browser uses these hints to make optimizations ahead of time, before the element changes.',
      requiredArtifacts: ['Styles']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (typeof artifacts.Styles === 'undefined' ||
        artifacts.Styles === -1) {
      return WillChangeAudit.generateAuditResult({
        rawValue: -1,
        debugString: 'Styles gatherer did not run'
      });
    }

    // const pageHost = url.parse(artifacts.URL.finalUrl).host;
    console.log(artifacts.Styles)

    const results = [];

    return WillChangeAudit.generateAuditResult({
      rawValue: results.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: results
      }
    });
  }
}

module.exports = WillChangeAudit;
