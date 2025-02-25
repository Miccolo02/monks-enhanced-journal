import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class OrganizationSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.organization"),
            template: "modules/monks-enhanced-journal/templates/organization.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [{ dropSelector: ".organization-container" }],
            scrollY: [".tab.description .tab-inner"]
        });
    }

    async getData() {
        let data = super.getData();

        data.relationships = {};
        for (let item of (data.data.flags['monks-enhanced-journal']?.relationships || [])) {
            let entity = await this.getDocument(item, "JournalEntry", false);
            if (entity && entity.testUserPermission(game.user, "LIMITED") && (game.user.isGM || !item.hidden)) {
                if (!data.relationships[entity.type])
                    data.relationships[entity.type] = { type: entity.type, name: i18n(`MonksEnhancedJournal.${entity.type.toLowerCase()}`), documents: [] };

                item.name = entity.name;
                item.img = entity.data.img;

                data.relationships[entity.type].documents.push(item);
            }
        }

        for (let [k, v] of Object.entries(data.relationships)) {
            v.documents = v.documents.sort((a, b) => a.name.localeCompare(b.name));
        }

        return data;
    }

    get type() {
        return 'organization';
    }

    get allowedRelationships() {
        return ['person', 'place', 'organization'];
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);
        $('.item-action', html).on('click', this.alterItem.bind(this));
        $('.item-hide', html).on('click', this.alterItem.bind(this));
        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.items-list .actor-icon', html).click(this.openRelationship.bind(this));
        $('.item-relationship .item-field', html).on('change', this.alterRelationship.bind(this));
    }

    _documentControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchDescription"), callback: this.enhancedjournal.searchText },
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: () => { this.onEditDescription(); } },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: () => { } }
        ];
        //this.addPolyglotButton(ctrls);
        return ctrls.concat(super._documentControls());
    }

    _getSubmitData(updateData = {}) {
        let data = expandObject(super._getSubmitData(updateData));

        if (data.relationships) {
            data.flags['monks-enhanced-journal'].relationships = duplicate(this.object.getFlag("monks-enhanced-journal", "relationships") || []);
            for (let relationship of data.flags['monks-enhanced-journal'].relationships) {
                let dataRel = data.relationships[relationship.id];
                if (dataRel)
                    relationship = mergeObject(relationship, dataRel);
            }
            delete data.relationships;
        }

        return flattenObject(data);
    }

    _canDragDrop(selector) {
        return game.user.isGM || this.object.isOwner;
    }

    _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if (data.type == 'JournalEntry') {
            this.addRelationship(data);
        }

        log('drop data', event, data);
    }
}
