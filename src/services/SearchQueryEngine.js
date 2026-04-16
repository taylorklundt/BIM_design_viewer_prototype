/**
 * SearchQueryEngine — query evaluator for Search Sets.
 *
 * Supports two data paths:
 *   1. IFC models loaded via @thatopen/components (FragmentsGroup) —
 *      reads properties from model.getLocalProperties() and resolves
 *      IFC type codes to human-readable names.
 *   2. Mock / plain scenes — falls back to mesh.userData properties.
 *
 * Call flow:
 *   buildIndex()  →  creates a flat map of { elementId → props }
 *   execute(set)  →  iterates the index, evaluates conditions, returns IDs
 */
import * as WEBIFC from 'web-ifc';

const IFC_TYPE_MAP = buildIfcTypeMap();

export class SearchQueryEngine {
  /**
   * @param {THREE.Scene}  scene
   * @param {object}       [options]
   * @param {IFCLoader}    [options.ifcLoader]   — for accessing FragmentsGroup properties
   * @param {Selection}    [options.selection]    — for currentSelection scope
   * @param {Sectioning}   [options.sectioning]  — for appliedSectionBox scope
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.ifcLoader = options.ifcLoader || null;
    this.selection = options.selection || null;
    this.sectioning = options.sectioning || null;

    this._index = null; // Map<string, ElementRecord>
  }

  /**
   * Build / rebuild the searchable element index.
   * Call after model load or when the scene changes.
   */
  buildIndex() {
    this._index = new Map();
    // Maps numeric expressID → mesh UUID(s) that contain the element
    this._expressIdToMeshUuids = new Map();

    // Path 1 — IFC models from @thatopen/components
    if (this.ifcLoader) {
      const models = this.ifcLoader.getLoadedModels();
      for (const modelInfo of models) {
        const modelData = this.ifcLoader.getModel(modelInfo.id);
        if (!modelData?.model) continue;
        this._indexFragmentsGroup(modelData.model);
      }
    }

    // Path 2 — fallback: plain meshes with userData (mock scenes)
    if (this._index.size === 0) {
      this._indexMeshUserData();
    }

    console.log(`[SearchQueryEngine] Index built — ${this._index.size} elements`);
  }

  /**
   * Execute a search set and return matching element IDs.
   */
  execute(searchSet) {
    if (!this._index || this._index.size === 0) {
      this.buildIndex();
    }

    let entries = [...this._index.entries()];

    // Scope filtering
    const scopeType = searchSet.scope?.type || 'entireModel';
    if (scopeType === 'currentSelection' && this.selection) {
      const selected = new Set(this.selection.getSelected());
      entries = entries.filter(([id]) => selected.has(id));
    }

    const matchingIds = [];
    for (const [id, record] of entries) {
      const matches = this._evaluateGroup(searchSet.conditions, record.props);
      const invert = searchSet.mode === 'excluding';
      if (invert ? !matches : matches) {
        matchingIds.push(id);
      }
    }

    console.log(`[SearchQueryEngine] ${entries.length} elements scanned → ${matchingIds.length} matches`);
    return matchingIds;
  }

  /**
   * Convert expressIDs to mesh UUIDs that Selection can find.
   * For mock scenes the IDs are already mesh-resolvable (uuid or userData.expressID).
   * For OBC models, maps expressIDs → FragmentMesh UUIDs.
   */
  toSelectableIds(expressIds) {
    if (!this._expressIdToMeshUuids || this._expressIdToMeshUuids.size === 0) {
      // No fragment mapping — IDs are already mesh-resolvable (mock scene)
      return expressIds;
    }
    const uuids = new Set();
    for (const id of expressIds) {
      const meshUuids = this._expressIdToMeshUuids.get(String(id));
      if (meshUuids) {
        for (const uuid of meshUuids) uuids.add(uuid);
      }
    }
    return [...uuids];
  }

  /**
   * Diagnostic — dumps the index to console.
   * Call from browser console: viewer.searchSets.diagnose()
   */
  diagnose() {
    if (!this._index || this._index.size === 0) this.buildIndex();

    const typeCounts = new Map();
    const allCategories = new Set();

    for (const [, record] of this._index) {
      const t = record.props.Element?.type || '(empty)';
      typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
      for (const cat of Object.keys(record.props)) {
        allCategories.add(cat);
      }
    }

    console.group(`[SearchQueryEngine] Index diagnosis — ${this._index.size} elements`);
    console.log('Element.type summary:', Object.fromEntries(typeCounts));
    console.log('Available categories:', [...allCategories]);

    const sample = [...this._index.entries()].slice(0, 5);
    console.group('Sample elements (first 5)');
    for (const [id, record] of sample) {
      console.log({ id, props: record.props });
    }
    console.groupEnd();
    console.groupEnd();

    return {
      elementCount: this._index.size,
      types: Object.fromEntries(typeCounts),
      categories: [...allCategories],
    };
  }

  // ── Index builders ──────────────────────────────────────────

  _indexFragmentsGroup(model) {
    const localProps = model.getLocalProperties?.();
    if (!localProps) {
      console.warn('[SearchQueryEngine] Model has no local properties — falling back to mesh scan');
      return;
    }

    // Build expressID → mesh UUID map from fragments
    // Each Fragment has ids (Set<number>) and a mesh (FragmentMesh / InstancedMesh)
    const geometryIds = new Set();
    if (model.items) {
      for (const fragment of model.items) {
        for (const itemId of fragment.ids) {
          geometryIds.add(itemId);
          const key = String(itemId);
          if (!this._expressIdToMeshUuids.has(key)) {
            this._expressIdToMeshUuids.set(key, new Set());
          }
          this._expressIdToMeshUuids.get(key).add(fragment.mesh.uuid);
        }
      }
    }

    for (const [expressIDStr, rawProps] of Object.entries(localProps)) {
      const expressID = Number(expressIDStr);

      // Skip non-geometric entities (property sets, relations, materials, etc.)
      if (geometryIds.size > 0 && !geometryIds.has(expressID)) continue;

      const record = this._parseIfcProps(expressID, rawProps, localProps);
      if (record) {
        this._index.set(String(expressID), record);
      }
    }
  }

  _parseIfcProps(expressID, rawProps, allProps) {
    // rawProps is a web-ifc decoded entity, e.g.:
    //   { type: 2391406946, Name: {value: "Wall-001"}, ObjectType: {value: "Basic Wall"}, ... }
    const ifcTypeCode = rawProps.type;
    const typeName = IFC_TYPE_MAP.get(ifcTypeCode) || `IFC_${ifcTypeCode}`;

    const getName = (v) => {
      if (!v) return '';
      if (typeof v === 'string') return v;
      if (v.value !== undefined) return String(v.value);
      return '';
    };

    const element = {
      name: getName(rawProps.Name) || getName(rawProps.LongName) || '',
      type: typeName,
      expressID: String(expressID),
      objectType: getName(rawProps.ObjectType) || '',
      description: getName(rawProps.Description) || '',
      tag: getName(rawProps.Tag) || '',
    };

    const props = { Element: element };

    // Resolve property sets attached via HasPropertySets or through relations
    if (rawProps.IsDefinedBy && Array.isArray(rawProps.IsDefinedBy)) {
      for (const relRef of rawProps.IsDefinedBy) {
        const relId = relRef?.value ?? relRef;
        const relEntity = allProps[relId];
        if (!relEntity) continue;
        this._extractPsetFromRelation(relEntity, allProps, props);
      }
    }

    // Also check direct HasPropertySets (some IFC schemas)
    if (rawProps.HasPropertySets && Array.isArray(rawProps.HasPropertySets)) {
      for (const psetRef of rawProps.HasPropertySets) {
        const psetId = psetRef?.value ?? psetRef;
        const psetEntity = allProps[psetId];
        if (psetEntity) {
          this._extractPset(psetEntity, allProps, props);
        }
      }
    }

    return { expressID, props };
  }

  _extractPsetFromRelation(relEntity, allProps, props) {
    // IfcRelDefinesByProperties → RelatingPropertyDefinition → IfcPropertySet
    const psetRef = relEntity.RelatingPropertyDefinition;
    if (!psetRef) return;
    const psetId = psetRef.value ?? psetRef;
    const psetEntity = allProps[psetId];
    if (psetEntity) {
      this._extractPset(psetEntity, allProps, props);
    }
  }

  _extractPset(psetEntity, allProps, props) {
    const psetName = psetEntity.Name?.value || psetEntity.Name || `Pset_${psetEntity.expressID}`;
    if (!props[psetName]) props[psetName] = {};

    // IfcPropertySet → HasProperties → [IfcPropertySingleValue, ...]
    const hasPropsList = psetEntity.HasProperties;
    if (!Array.isArray(hasPropsList)) return;

    for (const propRef of hasPropsList) {
      const propId = propRef?.value ?? propRef;
      const propEntity = allProps[propId];
      if (!propEntity) continue;

      const propName = propEntity.Name?.value || propEntity.Name || '';
      if (!propName) continue;

      let propValue = '';
      if (propEntity.NominalValue !== undefined) {
        propValue = propEntity.NominalValue?.value ?? propEntity.NominalValue ?? '';
      }

      props[psetName][propName] = String(propValue);
    }
  }

  _indexMeshUserData() {
    this.scene.traverse(obj => {
      if (!obj.isMesh || !obj.visible) return;

      const ud = obj.userData || {};
      const id = ud.expressID ?? obj.uuid;

      let resolvedType = ud.type || ud.ifcType || '';
      if (!resolvedType && obj.name) resolvedType = obj.name;

      let resolvedName = ud.name || obj.name || '';

      const element = {
        name: resolvedName,
        type: resolvedType,
        expressID: String(id),
        level: ud.level || '',
      };

      const props = { Element: element };

      if (ud.properties && typeof ud.properties === 'object') {
        for (const [cat, catProps] of Object.entries(ud.properties)) {
          props[cat] = catProps;
        }
      }

      for (const [key, val] of Object.entries(ud)) {
        if (['properties', 'expressID', 'name', 'type', 'ifcType', 'level'].includes(key)) continue;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          if (!props[key]) props[key] = val;
        }
      }

      this._index.set(String(id), { expressID: id, props });
    });
  }

  // ── Condition evaluation ──────────────────────────────────────

  _evaluateGroup(group, props) {
    if (!group || !group.rules || group.rules.length === 0) return true;

    const logic = (group.logic || 'and').toLowerCase();

    for (const rule of group.rules) {
      let result;
      if (rule.type === 'group') {
        result = this._evaluateGroup(rule, props);
      } else {
        result = this._evaluateCondition(rule, props);
      }

      if (logic === 'or' && result) return true;
      if (logic === 'and' && !result) return false;
    }

    return logic === 'and';
  }

  _evaluateCondition(cond, props) {
    const catData = props[cond.category];
    if (!catData) {
      return cond.operator === 'undefined';
    }

    const rawValue = catData[cond.property];
    const isDefined = rawValue !== undefined && rawValue !== null && rawValue !== '';

    switch (cond.operator) {
      case 'defined':
        return isDefined;
      case 'undefined':
        return !isDefined;
      case 'equals':
        return String(rawValue) === String(cond.value);
      case 'notEquals':
        return String(rawValue) !== String(cond.value);
      case 'contains':
        return isDefined && String(rawValue).toLowerCase().includes(String(cond.value).toLowerCase());
      case 'notContains':
        return !isDefined || !String(rawValue).toLowerCase().includes(String(cond.value).toLowerCase());
      default:
        return false;
    }
  }
}

// ── IFC type code → name mapping ──────────────────────────────

function buildIfcTypeMap() {
  const map = new Map();
  try {
    for (const [key, val] of Object.entries(WEBIFC)) {
      if (typeof val === 'number' && key.startsWith('IFC') && key === key.toUpperCase()) {
        // IFCWALL → IfcWall
        const pretty = 'Ifc' + key.slice(3).toLowerCase()
          .replace(/(^|[^a-z])([a-z])/g, (_, pre, c) => pre + c.toUpperCase())
          .replace(/standardcase/i, 'StandardCase')
          .replace(/elementedcase/i, 'ElementedCase');
        map.set(val, pretty);
      }
    }
  } catch {
    // web-ifc not available — no mapping
  }
  return map;
}
