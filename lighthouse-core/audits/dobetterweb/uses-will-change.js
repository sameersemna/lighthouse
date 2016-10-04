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

function getPropertyUse(stylesheets, opt_name, opt_val) {
  if (!opt_name && !opt_val) {
    return [];
  }

  return stylesheets.slice(0).filter(s => {
    s.parsedContent = s.parsedContent.filter(item => {
      const usedName = item.property.name === opt_name;
      const usedVal = item.property.val.indexOf(opt_val) === 0; // val should start with needle
      if (opt_name && !opt_val) {
        return usedName;
      } else if (!opt_name && opt_val) {
        return usedVal;
      } else if (opt_name && opt_val) {
        return usedName && usedVal;
      }
    });
    return s.parsedContent.length > 0;
  });
}

function getFormattedStyleContent(content, parsedContent) {
  const lines = content.split('\n');

  const declarationRange = parsedContent.declarationRange;
  const lineNum = declarationRange.startLine;
  const start = declarationRange.startColumn;
  const end = declarationRange.endColumn;

  let rule;
  if (declarationRange.startLine === declarationRange.endLine) {
    rule = lines[lineNum].substring(start, end);
  } else {
    const startLine = lines[declarationRange.startLine];
    const endLine = lines[declarationRange.endLine];
    rule = lines.slice(startLine, endLine).reduce((prev, line) => {
      prev.push(line.substring(
          declarationRange.startColumn, declarationRange.endColumn));
      return prev;
    }, []).join('\n');
  }

  const block = `
${parsedContent.selector} {
  ${rule}
} (line: ${lineNum}, row: ${start}, col: ${end})`;

  return block;
}

class WillChangeAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'CSS',
      name: 'uses-will-change',
      description: 'Site should use the new CSS flexbox',
      helpText: 'You\'re using an older and <a href="https://developers.google.com/web/updates/2013/10/Flexbox-layout-isn-t-slow?hl=en" target="_blank">less performant</a> spec for <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout/Using_CSS_flexible_boxes" target="_blank">CSS Flexbox</a>: <code>display: box</code>. Consider using the newer version (<code>display: flex</code>).',
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

    const sheetsUsingDisplayBox = getPropertyUse(artifacts.Styles, 'display', 'box');

    const urlList = [];
    sheetsUsingDisplayBox.forEach(sheet => {
      sheet.parsedContent.forEach(props => {
        urlList.push({
          url: sheet.header.sourceURL,
          misc: getFormattedStyleContent(sheet.content, props)
        });
      });
    });

    return WillChangeAudit.generateAuditResult({
      rawValue: sheetsUsingDisplayBox.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: urlList
      }
    });
  }
}

module.exports = WillChangeAudit;
