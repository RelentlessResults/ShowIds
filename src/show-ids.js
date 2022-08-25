(function() {
    const DATA_ID_BORDER_CLASS = 'dm-data-id-border';
    const DATA_ID_INSET_CLASS = 'dm-data-id-inset';
    const DM_COLOUR_CLASS = 'dm-colour-modifier';

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
        const parents = [];
        leaf.parents().each(function() {parents.push(this)});
        const selector = buildSearch(leaf, parents);
        console.log(`Copying selector "${selector}" to clipboard`);
        navigator.clipboard.writeText(selector);
    }

    function buildSearch(leaf, parents) {
        if (hasSingleItem([leaf])) {
            return getQueryForElement(leaf);
        }
        for (const parent of parents) {
            const candidateChain = [parent, leaf];
            if (hasSingleItem(candidateChain)) {
                return candidateChain.map(getQueryForElement).join(' ');
            }
        }
        return getQueryForElement(leaf);
    }

    function hasSingleItem(items) {
        const $ = jQuery.noConflict();
        return $(items.map(getQueryForElement).join(' ')).length == 1;
    }

    function getQueryForElement(item) {
        const $ = jQuery.noConflict();
        if ($(item).attr('dm-data-id')) {
            return `[dm-data-id="${(item).attr('dm-data-id')}"]`;
        }
        if ($(item).attr('dmDataId')) {
            return `[dmDataId="${(item).attr('dm-data-id')}"]`;
        }
        return $(item).prop('nodeName');
    }

    function processDiv(element) {
        const $ = jQuery.noConflict();
        const pos = element.getBoundingClientRect();
        if (pos.width === 0 && pos.height === 0) {
            return;
        }
        let hasDataId = true;
        const div = $(element);
        // div.addClass(HIGHLIGHT_CLASS_NAME);
        let dataId = div.attr('dm-data-id');
        if (!dataId) {
            dataId = div.attr('dmDataId');
        }
        if (!dataId) {
            hasDataId = false;
            const nodeName = div.prop('nodeName');
            dataId = nodeName.indexOf('DM') === 0 ? nodeName : null;
        }

        // border rect
        const popoverBorder = window.document.createElement('div');
        $(popoverBorder)
            .addClass(DATA_ID_BORDER_CLASS)
            .attr('style', `position: fixed; left:${pos.left}px; top:${pos.top}px; width:${pos.width}px; height: ${pos.height}px; z-index:9999`);


        const popoverInset = window.document.createElement('div');
        $(popoverInset)
            .addClass(DATA_ID_INSET_CLASS)
            .attr('style', `position: fixed; left:${pos.left}px; top:${pos.top}px; z-index:9999`);
        document.body.prepend(popoverInset);
        document.body.prepend(popoverBorder);

        if (!hasDataId) {
            $(popoverBorder).addClass(DM_COLOUR_CLASS);
            $(popoverInset).addClass(DM_COLOUR_CLASS)
        }
        // info square
        const link = window.document.createElement('p');

        $(link).addClass('tippy-link').html(dataId).on("click", () => copyToClipboard(element));
        tippy(popoverInset, {
            content: link,
            appendTo: document.body,
            interactive: true,
            theme: 'maconomy',
            allowHTML: true
        });
    }

    function annotateDivs(divs) {
        const $ = jQuery.noConflict();
        return new Promise((resolve, reject) => {
            console.log(`Annotating ${divs.length} divs`);
            divs.each(function () {
                processDiv(this);
            });
        });
    }

    function createCSSClasses() {
        return new Promise((resolve, reject) => {
            const $ = jQuery.noConflict();
            $('<style/>', {
                text: `
    .${DATA_ID_BORDER_CLASS} {
      border: #ff0 solid 2px;
      pointer-events: none;
    }
    .${DATA_ID_INSET_CLASS} {
      background: #ff0;
      color: black;
      padding: 5px;
      width:10px;
      height:10px;
      enabled: true;
    }
    ${DM_COLOUR_CLASS} {
      background: #f0f;
      border-color: #f0f;
    }
    .tippy-tooltip.maconomy-theme {
      background-color: yellow;
      color: black;
    }
    .tippy-link {
      color: yellow;
      text-decoration: underline;
      cursor: pointer;
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