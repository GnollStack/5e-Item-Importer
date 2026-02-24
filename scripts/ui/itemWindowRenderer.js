/**
 * 5e Item Importer - Window Renderer
 * Handles all HTML generation for the item window
 */

/**
 * Type icons mapping
 */
const TYPE_ICONS = {
    weapon: "fa-sword",
    equipment: "fa-shield-alt",
    consumable: "fa-flask",
    tool: "fa-wrench",
    container: "fa-box-open",
    loot: "fa-gem",
    spell: "fa-magic"
};

/**
 * Default item icons by type
 */
const DEFAULT_ICONS = {
    weapon: "systems/dnd5e/icons/svg/items/weapon.svg",
    equipment: "systems/dnd5e/icons/svg/items/equipment.svg",
    consumable: "systems/dnd5e/icons/svg/items/consumable.svg",
    tool: "systems/dnd5e/icons/svg/items/tool.svg",
    container: "systems/dnd5e/icons/svg/items/container.svg",
    loot: "systems/dnd5e/icons/svg/items/loot.svg",
    spell: "systems/dnd5e/icons/svg/items/spell.svg"
};

/**
 * Format item type for display
 * @param {string} type - Item type code
 * @returns {string} Formatted type name
 */
export function formatType(type) {
    const typeMap = {
        weapon: "Weapon",
        equipment: "Equipment",
        consumable: "Consumable",
        tool: "Tool",
        loot: "Loot",
        container: "Container",
        spell: "Spell",
        feat: "Feature",
        class: "Class",
        background: "Background",
        facility: "Facility",
        race: "Race",
        subclass: "Subclass"
    };
    return typeMap[type] || type;
}

/**
 * Format rarity for display
 * @param {string} rarity - Rarity code
 * @returns {string} Formatted rarity name
 */
export function formatRarity(rarity) {
    const rarityMap = {
        common: "Common",
        uncommon: "Uncommon",
        rare: "Rare",
        veryRare: "Very Rare",
        legendary: "Legendary",
        artifact: "Artifact"
    };
    return rarityMap[rarity] || rarity;
}

/**
 * Get the preview icon for an item
 * @param {ItemData} item - The item
 * @returns {string} Icon path
 */
export function getPreviewIcon(item) {
    return DEFAULT_ICONS[item.type] || "icons/svg/item-bag.svg";
}

/**
 * Get quick stats for the stats bar
 * @param {ItemData} item - The item
 * @returns {Array} Array of stat objects
 */
export function getQuickStats(item) {
    const stats = [];

    if (item.cost > 0) {
        const costDisplay = item.costDisplay || item.getCostValue();
        const denom = item.costDenomination || "gp";
        stats.push({ icon: "fa-coins", value: `${costDisplay} ${denom}`, label: "Cost" });
    }

    if (item.weight > 0) {
        const unitDisplay = item.weightUnits === "lb" ? "lb." : item.weightUnits;
        stats.push({ icon: "fa-weight-hanging", value: `${item.weight} ${unitDisplay}`, label: "Weight" });
    }

    if (item.quantity > 1) {
        stats.push({ icon: "fa-layer-group", value: item.quantity, label: "Qty" });
    }

    if (item.damage && item.damage.formula) {
        stats.push({ icon: "fa-dice-d20", value: item.damage.formula, label: "Damage" });
    }

    if (item.armorClass) {
        stats.push({ icon: "fa-shield-alt", value: item.armorClass, label: "AC" });
    }

    if (item.spellLevel !== undefined && item.type === "spell") {
        const levelText = item.spellLevel === 0 ? "Cantrip" : `Level ${item.spellLevel}`;
        stats.push({ icon: "fa-hat-wizard", value: levelText, label: "Spell" });
    }

    return stats;
}

/**
 * Get basic properties for the item
 * @param {ItemData} item - The item
 * @returns {Array} Array of property objects
 */
export function getBasicProperties(item) {
    const props = [];

    if (item.type === "weapon" && item.weaponType) {
        const weaponTypes = {
            simpleM: "Simple Melee",
            simpleR: "Simple Ranged",
            martialM: "Martial Melee",
            martialR: "Martial Ranged",
            natural: "Natural",
            improv: "Improvised",
            siege: "Siege"
        };
        props.push({ label: "Weapon Type", value: weaponTypes[item.weaponType] || item.weaponType });
    }

    if (item.baseWeapon) {
        props.push({ label: "Base Weapon", value: item.baseWeapon });
    }

    if (item.type === "equipment" && item.armorType) {
        const armorTypes = {
            light: "Light Armor",
            medium: "Medium Armor",
            heavy: "Heavy Armor",
            shield: "Shield",
            natural: "Natural Armor"
        };
        props.push({ label: "Armor Type", value: armorTypes[item.armorType] || item.armorType });
    }

    if (item.baseEquipment) {
        props.push({ label: "Base Equipment", value: item.baseEquipment });
    }

    if (item.consumableType) {
        const consumableTypes = {
            ammo: "Ammunition",
            food: "Food",
            poison: "Poison",
            potion: "Potion",
            rod: "Rod",
            scroll: "Scroll",
            trinket: "Trinket",
            wand: "Wand"
        };
        props.push({ label: "Consumable Type", value: consumableTypes[item.consumableType] || item.consumableType });
    }

    if (item.toolType !== null && item.toolType !== undefined) {
        const toolTypes = {
            "": "Other Tools",
            art: "Artisan's Tools",
            game: "Gaming Set",
            music: "Musical Instrument"
        };
        props.push({ label: "Tool Type", value: toolTypes[item.toolType] || "Unknown" });
    }

    if (item.baseToolItem) {
        props.push({ label: "Base Tool", value: item.baseToolItem });
    }

    if (item.lootType) {
        const lootTypes = {
            art: "Art Object",
            gear: "Adventuring Gear",
            gem: "Gemstone",
            treasure: "Treasure",
            material: "Material",
            resource: "Resource",
            junk: "Junk"
        };
        props.push({ label: "Loot Type", value: lootTypes[item.lootType] || item.lootType });
    }

    return props;
}

/**
 * Get combat/mechanical properties
 * @param {ItemData} item - The item
 * @returns {Array} Array of property objects
 */
export function getCombatProperties(item) {
    const props = [];

    if (item.damage && item.damage.type) {
        const types = Array.isArray(item.damage.type) ? item.damage.type.join(", ") : item.damage.type;
        props.push({ label: "Damage Type", value: types });
    }

    if (item.versatileDamage && item.versatileDamage.formula) {
        props.push({ label: "Versatile", value: item.versatileDamage.formula });
    }

    if (item.range) {
        let rangeText = "";
        if (item.range.value) rangeText = `${item.range.value}`;
        if (item.range.long) rangeText += `/${item.range.long}`;
        if (item.range.units) rangeText += ` ${item.range.units}`;
        if (rangeText) props.push({ label: "Range", value: rangeText.trim() });
    }

    if (item.reach) {
        props.push({ label: "Reach", value: `${item.reach} ft.` });
    }

    if (item.magicBonus) {
        props.push({ label: "Magic Bonus", value: `+${item.magicBonus}` });
    }

    if (item.maxDexModifier !== null && item.maxDexModifier !== undefined) {
        props.push({ label: "Max Dex", value: `+${item.maxDexModifier}` });
    }

    if (item.strengthRequirement) {
        props.push({ label: "Str Required", value: item.strengthRequirement });
    }

    if (item.stealthDisadvantage) {
        props.push({ label: "Stealth", value: "Disadvantage", fullWidth: true });
    }

    // Spell properties
    if (item.type === "spell") {
        if (item.spellSchool) {
            const schools = {
                abj: "Abjuration", con: "Conjuration", div: "Divination",
                enc: "Enchantment", evo: "Evocation", ill: "Illusion",
                nec: "Necromancy", trs: "Transmutation"
            };
            props.push({ label: "School", value: schools[item.spellSchool] || item.spellSchool });
        }

        if (item.activationType) {
            props.push({ label: "Casting Time", value: item.activationType });
        }

        if (item.duration) {
            let durText = item.duration.value || "";
            if (item.duration.units) durText += ` ${item.duration.units}`;
            if (durText) props.push({ label: "Duration", value: durText.trim() });
        }

        const components = [];
        if (item.vocal) components.push("V");
        if (item.somatic) components.push("S");
        if (item.material) components.push("M");
        if (components.length > 0) {
            props.push({ label: "Components", value: components.join(", ") });
        }

        if (item.concentration) {
            props.push({ label: "Concentration", value: "Yes" });
        }

        if (item.ritual) {
            props.push({ label: "Ritual", value: "Yes" });
        }
    }

    return props;
}

/**
 * Get special properties
 * @param {ItemData} item - The item
 * @returns {Array} Array of property objects
 */
export function getSpecialProperties(item) {
    const props = [];

    if (item.properties && item.properties.length > 0) {
        props.push({ label: "Properties", value: item.properties.join(", "), fullWidth: true });
    }

    if (item.uses && item.uses.max) {
        props.push({ label: "Uses", value: `${item.uses.value || item.uses.max}/${item.uses.max}` });
    }

    if (item.recovery && item.recovery.length > 0) {
        const recoveryText = item.recovery.map(r => r.period).join(", ");
        props.push({ label: "Recovery", value: recoveryText });
    }

    if (item.attunementRequirement) {
        props.push({ label: "Attunement", value: item.attunementRequirement, fullWidth: true });
    }

    // Container properties
    if (item.itemCapacity) {
        props.push({ label: "Item Capacity", value: `${item.itemCapacity} items` });
    }

    if (item.weightCapacity) {
        const unit = item.weightCapacityUnits === "lb" ? "lb." : item.weightCapacityUnits;
        props.push({ label: "Weight Capacity", value: `${item.weightCapacity} ${unit}` });
    }

    if (item.volumeCapacity) {
        const unit = item.volumeCapacityUnits === "ft" ? "cu. ft." : "L";
        props.push({ label: "Volume Capacity", value: `${item.volumeCapacity} ${unit}` });
    }

    if (item.weightlessContents) {
        props.push({ label: "Weightless Contents", value: "Yes" });
    }

    // Material component details
    if (item.material && item.materialValue) {
        props.push({ label: "Material", value: item.materialValue, fullWidth: true });
    }

    return props;
}

/**
 * Render a collapsible section
 * @param {string} icon - FontAwesome icon name
 * @param {string} title - Section title
 * @param {Array} properties - Array of property objects
 * @returns {string} HTML string
 */
export function renderSection(icon, title, properties) {
    if (!properties || properties.length === 0) return "";

    let html = `<div class="ii-section">
    <div class="ii-section-header">
      <i class="fas fa-${icon} ii-section-icon"></i>
      <span class="ii-section-title">${title}</span>
      <i class="fas fa-chevron-down ii-section-toggle"></i>
    </div>
    <div class="ii-section-content">`;

    properties.forEach(prop => {
        const fullWidthClass = prop.fullWidth ? " full-width" : "";
        html += `<div class="ii-section-row${fullWidthClass}">
      <span class="ii-row-label">${prop.label}</span>
      <span class="ii-row-value">${prop.value}</span>
    </div>`;
    });

    html += `</div></div>`;
    return html;
}

/**
 * Render the item card preview
 * @param {ItemData} item - The parsed item
 * @param {Object} result - Parse result with warnings/errors
 * @returns {string} HTML string
 */
export function renderItemCard(item, result) {
    const typeIcon = TYPE_ICONS[item.type] || "fa-question";
    const itemIcon = getPreviewIcon(item);

    let html = `<div class="ii-item-card">`;

    // Card Header
    html += `<div class="ii-card-header">`;
    html += `<div class="ii-card-icon"><img src="${itemIcon}" alt="${item.name}"></div>`;
    html += `<div class="ii-card-title-block">`;
    html += `<h3 class="ii-card-name">${item.name}</h3>`;
    html += `<div class="ii-card-subtitle">`;
    html += `<span class="ii-card-type-badge type-${item.type}"><i class="fas ${typeIcon}"></i> ${formatType(item.type)}</span>`;
    html += `<span class="ii-card-rarity rarity-${item.rarity}">${formatRarity(item.rarity)}</span>`;

    if (item.isMagical) {
        html += `<span class="ii-card-magical"><i class="fas fa-sparkles"></i> Magical</span>`;
    }
    if (item.attunement && item.attunement !== "none" && item.attunement !== "") {
        html += `<span class="ii-card-attunement"><i class="fas fa-link"></i> Attunement</span>`;
    }

    html += `</div></div></div>`; // Close subtitle, title-block, header

    // Quick Stats Row
    const stats = getQuickStats(item);
    if (stats.length > 0) {
        html += `<div class="ii-card-stats">`;
        stats.forEach(stat => {
            html += `<div class="ii-stat-item">
        <i class="fas ${stat.icon}"></i>
        <span class="ii-stat-value">${stat.value}</span>
        <span class="ii-stat-label">${stat.label}</span>
      </div>`;
        });
        html += `</div>`;
    }

    // Card Body with Sections
    html += `<div class="ii-card-body">`;

    // Basic Properties Section
    const basicProps = getBasicProperties(item);
    if (basicProps.length > 0) {
        html += renderSection("info-circle", "Basic Properties", basicProps);
    }

    // Combat/Mechanical Section
    const combatProps = getCombatProperties(item);
    if (combatProps.length > 0) {
        html += renderSection("crosshairs", "Combat Statistics", combatProps);
    }

    // Special Properties Section
    const specialProps = getSpecialProperties(item);
    if (specialProps.length > 0) {
        html += renderSection("star", "Special Properties", specialProps);
    }

    // Description Section
    if (item.description && item.description.length > 0) {
        const cleanDesc = item.description.replace(/<[^>]+>/g, "").substring(0, 300);
        html += `<div class="ii-section ii-section-description">
      <div class="ii-section-header">
        <i class="fas fa-scroll ii-section-icon"></i>
        <span class="ii-section-title">Description</span>
        <i class="fas fa-chevron-down ii-section-toggle"></i>
      </div>
      <div class="ii-section-content">
        <div class="ii-description-text">${cleanDesc}${cleanDesc.length < item.description.replace(/<[^>]+>/g, "").length ? "..." : ""}</div>
      </div>
    </div>`;
    }

    // Activities & Effects Section
    const pendingActs = item.pendingActivities || [];
    if (pendingActs.length > 0) {
        const actCount = pendingActs.filter(a => a.key.startsWith('ACTIVITY_')).length;
        const effCount = pendingActs.filter(a => a.key === 'EFFECT').length;

        html += `<div class="ii-section">
      <div class="ii-section-header">
        <i class="fas fa-bolt ii-section-icon"></i>
        <span class="ii-section-title">Activities & Effects (${pendingActs.length})</span>
        <i class="fas fa-chevron-down ii-section-toggle"></i>
      </div>
      <div class="ii-section-content">`;

        // Check if activity importer is active (safely handle non-Foundry environments)
        const activityImporterActive = typeof game !== 'undefined' && game.modules?.get?.("5e-activity-importer")?.active;
        if (!activityImporterActive) {
            html += `<div class="ii-parse-warning" style="margin-bottom: 0.5em;"><i class="fas fa-exclamation-triangle"></i> 5e-activity-importer module is not active. These will be skipped on import.</div>`;
        }

        html += `<div class="ii-properties-grid">`;
        for (const pa of pendingActs) {
            const typeLabel = pa.key === 'EFFECT' ? 'Effect' : pa.key.replace('ACTIVITY_', '');
            const icon = pa.key === 'EFFECT' ? 'fa-magic' : 'fa-bolt';
            html += `<div class="ii-prop"><span class="ii-prop-label"><i class="fas ${icon}"></i> ${typeLabel}</span><span class="ii-prop-value">${pa.name}</span></div>`;
        }
        html += `</div>`;

        const summary = [];
        if (actCount > 0) summary.push(`${actCount} activit${actCount === 1 ? 'y' : 'ies'}`);
        if (effCount > 0) summary.push(`${effCount} effect${effCount === 1 ? '' : 's'}`);
        html += `<p style="margin: 0.5em 0 0; font-size: 0.85em; opacity: 0.8;">${summary.join(' and ')} will be added on import</p>`;

        html += `</div></div>`;
    }

    // Issues Section
    const allIssues = [...(result.errors || []), ...(result.warnings || [])];
    if (allIssues.length > 0) {
        html += `<div class="ii-section ii-section-issues">
      <div class="ii-section-header">
        <i class="fas fa-exclamation-triangle ii-section-icon"></i>
        <span class="ii-section-title">Warnings (${allIssues.length})</span>
        <i class="fas fa-chevron-down ii-section-toggle"></i>
      </div>
      <div class="ii-section-content">
        <ul class="ii-issues-list">
          ${allIssues.map(issue => `<li>${issue}</li>`).join("")}
        </ul>
      </div>
    </div>`;
    }

    html += `</div></div>`; // Close card-body, item-card

    return html;
}

/**
 * Render batch summary with selection controls
 * @param {Object} results - Batch results object
 * @param {Set} selectedItems - Set of selected indices
 * @returns {string} HTML string
 */
export function renderBatchSummary(results, selectedItems) {
    let html = `<div class="ii-item-card">`;

    // Header for batch
    html += `<div class="ii-card-header">
    <div class="ii-card-icon"><i class="fas fa-boxes" style="font-size: 32px; color: #fff;"></i></div>
    <div class="ii-card-title-block">
      <h3 class="ii-card-name">Batch Import</h3>
      <div class="ii-card-subtitle">
        <span class="ii-card-type-badge" style="background: var(--ii-success);">
          <i class="fas fa-check"></i> ${results.successes.length} Ready
        </span>
        ${results.failures.length > 0 ? `
        <span class="ii-card-type-badge" style="background: var(--ii-error);">
          <i class="fas fa-times"></i> ${results.failures.length} Failed
        </span>` : ""}
      </div>
    </div>
  </div>`;

    // Selection controls and grid of parsed items
    if (results.successes.length > 0) {
        html += `<div class="ii-card-body">
      <div class="ii-section">
        <div class="ii-section-header">
          <i class="fas fa-check-circle ii-section-icon" style="color: var(--ii-success);"></i>
          <span class="ii-section-title">Select Items to Import</span>
          <i class="fas fa-chevron-down ii-section-toggle"></i>
        </div>
        <div class="ii-section-content" style="display: block;">
          
          <div class="ii-batch-controls">
            <div class="ii-batch-select-actions">
              <button type="button" class="ii-batch-select-btn" data-action="selectAll">
                <i class="fas fa-check-double"></i> Select All
              </button>
              <button type="button" class="ii-batch-select-btn" data-action="selectNone">
                <i class="fas fa-square"></i> Select None
              </button>
            </div>
            <div class="ii-batch-count">
              <strong id="ii-selected-count">${selectedItems.size}</strong> of ${results.successes.length} selected
            </div>
          </div>

          <div class="ii-batch-grid">`;

        results.successes.forEach((res, index) => {
            const icon = getPreviewIcon(res.item);
            const isSelected = selectedItems.has(index);
            html += `<div class="ii-batch-item success selectable${isSelected ? " selected" : ""}" data-action="toggleBatchItem" data-index="${index}">
        <input type="checkbox" class="ii-batch-checkbox" data-index="${index}"${isSelected ? " checked" : ""}>
        <div class="ii-batch-item-icon-wrapper">
          <img src="${icon}" alt="">
        </div>
        <div class="ii-batch-item-info">
          <div class="ii-batch-item-name">${res.item.name}</div>
          <div class="ii-batch-item-type">${formatType(res.item.type)} • ${formatRarity(res.item.rarity)}</div>
        </div>
      </div>`;
        });

        html += `</div></div></div>`;
    }

    // Failed items
    if (results.failures.length > 0) {
        html += `<div class="ii-section ii-section-issues">
      <div class="ii-section-header">
        <i class="fas fa-exclamation-triangle ii-section-icon"></i>
        <span class="ii-section-title">Failed Items (${results.failures.length})</span>
        <i class="fas fa-chevron-down ii-section-toggle"></i>
      </div>
      <div class="ii-section-content" style="display: block;">
        <ul class="ii-issues-list">`;

        results.failures.forEach(fail => {
            const firstLine = fail.text.split("\n")[0].trim().substring(0, 40);
            html += `<li><strong>"${firstLine}..."</strong><br>${fail.errors.join(", ")}</li>`;
        });

        html += `</ul></div></div>`;
    }

    html += `</div></div>`; // Close card-body, item-card
    return html;
}