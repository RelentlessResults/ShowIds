(function() {
    const DATA_ID_BORDER_CLASS = 'dm-data-id-border';
    const DATA_ID_INSET_CLASS = 'dm-data-id-inset';
    const BORDER_HOVER_CLASS = 'dm-colour-modifier';

    const HIGHLIGHT_COLOUR = '#9f0';
    const HOVER_COLOUR = '#F90';

    const insetPositions = [];

    function addScript(scriptPath) {
        return new Promise((resolve) => {
            javascript: (function (e, s) {
                e.src = s;
                e.onload = resolve;
                document.head.appendChild(e);
            })(document.createElement('script'), scriptPath);
        });
    }

    function loadJQuery() {
        return new Promise((resolve, reject) => {
            addScript('//code.jquery.com/jquery-latest.min.js').then(() => {
                jQuery.noConflict();
                console.log('jQuery injected');
                resolve();
            });
        });
    }

    function loadTippy() {
        console.log('Loading tippy...');
        return new Promise((resolve, reject) => {
            addScript('https://unpkg.com/@popperjs/core@2')
                .then(() => {
                    return addScript('https://unpkg.com/tippy.js@6')
                })
                .then(() => {
                    console.log('Tippy injected');
                    resolve();
                });
        });
    }

    function clearExistingDivs(divs) {
        return new Promise((resolve, reject) => {
            const $ = jQuery.noConflict();
            $(`.${DATA_ID_INSET_CLASS}, .${DATA_ID_BORDER_CLASS}`).remove();
            resolve();
        });
    }

    function findAllDMElements() {
        return new Promise((resolve, reject) => {
            const $ = jQuery.noConflict();
            const filtered = $('*').filter(function () {
                return $(this).prop('nodeName').indexOf('DM') === 0
            });
            resolve(filtered);
        });
    }

    function findAllDataIdElements() {
        return new Promise((resolve, reject) => {
            const $ = jQuery.noConflict();
            console.log(`looking for DataId divs`);
            const result = $('[dm-data-id],[dmDataId]');
            resolve(result);
        });
    }

    function copyToClipboard(leafElement) {
        const $ = jQuery.noConflict();
        const leaf = $(leafElement);
        let parents = [];
        leaf.parents().each(function() {parents.unshift(this)});
        parents = parents.filter(item => item && getQueryForElement(item));
        console.log(`Building concise selector from hierarchy ${getQueryForElements(parents)}`);
        const selector = buildSearch([leaf], parents);
        if (!selector) {
            console.warn('Not creating a selector since a unique one could not be built. Consider adding some unique dmDataId directives to the templates.');
            return;
        }
        console.log(`Copying selector "${selector}" to clipboard`);
        navigator.clipboard.writeText(selector);
    }

    function buildSearch(leaves, parents) {
        if (countMatches(leaves) === 1) {
            return getQueryForElements(leaves);
        }
        for (const parent of parents) {
            const candidateChain = [parent].concat(leaves);
            if (countMatches(candidateChain) === 1) {
                return getQueryForElements(candidateChain);
            }
        }
        if (parents.length == 0) {
            console.warn(`Cannot build a unique selector for ${getQueryForElements(leaves)} using up to ${leaves.length} items. Found ${countMatches(leaves)} matches.`);
            return null;
        }
        const lastParent = parents[parents.length-1];
        return buildSearch([lastParent].concat(leaves), parents.slice(0, parents.length-2));
    }

    function countMatches(items) {
        const $ = jQuery.noConflict();
        const selector = getQueryForElements(items);
        return $(selector).length;
    }

    function getQueryForElements(items) {
        return items.map(item => getQueryForElement(item)).join(' ');
    }

    function getQueryForElement(item) {
        const $ = jQuery.noConflict();
        if ($(item).attr('dm-data-id')) {
            return `[dm-data-id="${(item).attr('dm-data-id')}"]`;
        }
        if ($(item).attr('dmDataId')) {
            return `[dmDataId="${(item).attr('dm-data-id')}"]`;
        }
        const nodeName = $(item).prop('nodeName');
        if (nodeName.indexOf('DM-') === 0) {
            return nodeName;
        }
        return null;
    }

    function processDiv(element) {
        const $ = jQuery.noConflict();
        const div = $(element);
        const pos = element.getBoundingClientRect();
        if (pos.width === 0 && pos.height === 0) {
            return;
        }
        // border rect
        const popoverBorder = window.document.createElement('div');
        $(popoverBorder)
            .addClass(DATA_ID_BORDER_CLASS)
            .attr('style', `position: fixed; left:${pos.left}px; top:${pos.top}px; width:${pos.width}px; height: ${pos.height}px;`);


        const popoverInset = window.document.createElement('div');
        const [insetX, insetY] = getInsetPosition(pos);
        $(popoverInset)
            .addClass(DATA_ID_INSET_CLASS)
            .attr('style', `position: fixed; left:${insetX}px; top:${insetY}px;`)
            .hover(function() {
                $(popoverBorder).addClass(BORDER_HOVER_CLASS);
            }, function() {
                $(popoverBorder).removeClass(BORDER_HOVER_CLASS);
            });
        document.body.prepend(popoverInset);
        document.body.prepend(popoverBorder);

        // info square
        const link = window.document.createElement('p');

        $(link).addClass('tippy-link').html(getQueryForElement(div)).on("click", () => copyToClipboard(element));
        tippy(popoverInset, {
            content: link,
            appendTo: document.body,
            interactive: true,
            theme: 'maconomy',
            allowHTML: true,
            delay: 2000
        });
    }

    function getInsetPosition(desiredPosition) {
        const gridSize = 12;
        const originX = Math.round(desiredPosition.left / gridSize);
        const originY = Math.round(desiredPosition.top / gridSize);
        const maxSquareLength = 5;
        for (let squareLength = 1; squareLength < maxSquareLength; squareLength++) {
            for (let index=0; index<squareLength-1; index++) {
                let [x, y] = getSquareOffsets(squareLength, index);
                x += originX;
                y += originY;
                let occupied = true;
                if (insetPositions[y] === undefined) {
                    insetPositions[y] = [];
                    occupied = false;
                }
                const row = insetPositions[y];
                if (row[x] === undefined) {
                    row[x] = true;
                    occupied = false;
                }
                if (!occupied) {
                    return [x * gridSize, y * gridSize];
                }
            }
        }
        console.warn('cannot find a unique position. Overlapping.');
        return [originX, originY];
    }

    function getSquareOffsets(sideLength, index) {
        if (index > (2*sideLength-1)) {
            throw new Error('index out of bounds');
        }
        if (index < sideLength) {
            return [index, sideLength-1];
        }
        return [sideLength-1, index - sideLength];
    }

    function annotateDivs(divs) {
        const $ = jQuery.noConflict();
        return new Promise((resolve, reject) => {
            console.log(`Annotating ${divs.length} divs`);
            divs.each(function () {
                processDiv(this);
            });
            resolve();
        });
    }

    function createCSSClasses() {
        return new Promise((resolve, reject) => {
            const $ = jQuery.noConflict();
            $('<style/>', {
                text: `
    .${DATA_ID_BORDER_CLASS} {
      border: ${HIGHLIGHT_COLOUR} solid 1px;
      pointer-events: none;
      z-index: 5000
    }
    .${DATA_ID_INSET_CLASS} {
      background: ${HIGHLIGHT_COLOUR};
      color: black;
      padding: 5px;
      width:10px;
      height:10px;
      enabled: true;
      z-index: 6000;
    }
    .${DATA_ID_INSET_CLASS}:hover {
        background: ${HOVER_COLOUR};
    }
    .${BORDER_HOVER_CLASS} {
      border: ${HOVER_COLOUR} solid 3px;
      z-index: 8000;
    }
    .tippy-tooltip.maconomy-theme {
      background-color: yellow;
      color: black;
    }
    .tippy-link {
      color: ${HIGHLIGHT_COLOUR};
      cursor: pointer;
    }
    .tippy-link: hover {
      color: ${HOVER_COLOUR};
      text-decoration: underline;
    }
    `,
            }).appendTo('head');
            resolve();
        });
    }

    loadJQuery()
        .then(loadTippy)
        .then(createCSSClasses)
        .then(clearExistingDivs)
        .then(findAllDataIdElements)
        .then(annotateDivs)
        .then(findAllDMElements)
        .then(annotateDivs);

}) ();