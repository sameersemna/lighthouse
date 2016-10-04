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
 * @fileoverview Audit a page to see if it is using the display: box flexbox.
 */

'use strict';

const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

/**
 * @param {!Array} stylesheets A list of stylesheets used by the page.
 * @param {string=} propName Optional name of the CSS property to filter results
 *     on. If propVal is not specified, all stylesheets that use the property are
 *     returned. Otherwise, stylesheets that use the propName: propVal are returned.
 * @param {string=} propVal Optional value of the CSS property to filter results on.
 * @return {Array} A list of stylesheets that use the CSS property.
 */
function stylesheetsThatUsedProperty(stylesheets, propName, propVal) {
  if (!propName && !propVal) {
    return [];
  }

  return stylesheets.slice(0).filter(s => {
    s.parsedContent = s.parsedContent.filter(item => {
      const usedName = item.property.name === propName;
      const usedVal = item.property.val.indexOf(propVal) === 0; // val should start with needle
      if (propName && !propVal) {
        return usedName;
      } else if (!propName && propVal) {
        return usedVal;
      } else if (propName && propVal) {
        return usedName && usedVal;
      }
      return false;
    });
    return s.parsedContent.length > 0;
  });
}

/**
 * @param {!string} content CSS text content.
 * @param {!Object} parsedContent Parsed CSS content.
 * @return {string} Formatted output
 */
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

class UsesNewFlexBoxAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'CSS',
      name: 'uses-new-flexbox',
      description: 'Site does not use the old CSS flexbox',
      helpText: 'The older spec for CSS Flexbox (<code>display: box</code>) is deprecated and <a href="https://developers.google.com/web/updates/2013/10/Flexbox-layout-isn-t-slow?hl=en" target="_blank">less performant</a>. Consider using the <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout/Using_CSS_flexible_boxes" target="_blank">newer version</a> (<code>display: flex</code>), which does not suffer from the same issues.',
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
      return UsesNewFlexBoxAudit.generateAuditResult({
        rawValue: -1,
        debugString: 'Styles gatherer did not run'
      });
    }

    // TODO: consider usage of vendor prefixes
    // TODO: consider usage of other properties (e.g. box-flex)
    const sheetsUsingDisplayBox = stylesheetsThatUsedProperty(
        artifacts.Styles, 'display', 'box');

    const urlList = [];
    sheetsUsingDisplayBox.forEach(sheet => {
      sheet.parsedContent.forEach(props => {
        urlList.push({
          url: sheet.header.sourceURL,
          misc: getFormattedStyleContent(sheet.content, props)
        });
      });
    });

    return UsesNewFlexBoxAudit.generateAuditResult({
      rawValue: sheetsUsingDisplayBox.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: urlList
      }
    });
  }
}

module.exports = UsesNewFlexBoxAudit;
