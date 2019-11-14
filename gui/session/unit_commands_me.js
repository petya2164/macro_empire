// Get all of the available entities which can be trained by the selected entities
function getAllTrainableEntities(selection)
{
	if (selection.length)
	{
		var st = GetEntityState(selection[0]);
		//warn("getAllTrainableEntities: entity[0] " + st.template);
	}

	var trainableEnts = [];
	var state;
	// Get all buildable and trainable entities
	for (let ent of selection)
	{
		state = GetEntityState(ent);
		if (!state)
			continue;

		if (state.unitAI && state.player > 0)
		{
			//warn("got a unit: " + state.template);
			return getAllUnitsForCiv(g_Players[state.player].civ);
		}

		if (state.production && state.production.entities.length)
			trainableEnts = trainableEnts.concat(state.production.entities);
	}

	// Remove duplicates
	removeDupes(trainableEnts);
	return trainableEnts;
}

// Get all of the available entities which can be built by the selected entities
function getAllBuildableEntities(selection)
{
	if (selection.length)
	{
		var st = GetEntityState(selection[0]);
		//warn("getAllBuildableEntities: entity[0] " + st.template);
	}

	return Engine.GuiInterfaceCall("GetAllBuildableEntities", { "entities": selection });
}

var g_ParsedData = {
	"units": {},
	"structures": {},
	"techs": {},
	"phases": {}
};

var g_Lists = {};
var g_AuraData = {};
var g_RawTemplateData = {};

function getAllUnitsForCiv(civCode)
{
	var civ = g_CivData[civCode];
	warn("getAllUnitsForCiv: " + civ.Name);

	if (civ.militaryUnits)
		return civ.militaryUnits;

	g_Lists = {
		"units": [],
		"structures": [],
		"techs": []
	};

	// get initial units
	var startStructs = [];
	for (let entity of civ.StartEntities)
	{
		if (entity.Template.slice(0, 5) == "units")
			g_Lists.units.push(entity.Template);
		else if (entity.Template.slice(0, 6) == "struct")
		{
			g_Lists.structures.push(entity.Template);
			startStructs.push(entity.Template);
		}
	}

	// Load units and structures
	var unitCount = 0;
	do
	{
		for (let u of g_Lists.units)
			if (!g_ParsedData.units[u])
				g_ParsedData.units[u] = loadUnit(u, civCode);

		unitCount = g_Lists.units.length;

		for (let s of g_Lists.structures)
			if (!g_ParsedData.structures[s])
				g_ParsedData.structures[s] = loadStructure(s, civCode);

	} while (unitCount < g_Lists.units.length);

	civ.allUnits = g_Lists.units;
	civ.allStructures = g_Lists.structures;
	civ.militaryUnits = [];

	var militaryTypes = ["Melee", "Ranged"];

	for (let templateName of g_Lists.units)
	{
		var template = GetRawTemplateData(templateName);
		if (!template.Identity)
			continue;
		var classList = GetIdentityClasses(template.Identity);
		var name = template.Identity.SelectionGroupName || templateName;
		if (militaryTypes.some(c => classList.indexOf(c) != -1) &&
			civ.militaryUnits.indexOf(name) < 0)
			civ.militaryUnits.push(name);
	}

	return civ.militaryUnits;
}

function GetRawTemplateData(templateName)
{
	if (!(templateName in g_RawTemplateData))
	{
		let template = Engine.GuiInterfaceCall("GetRawTemplateData", templateName);
		translateObjectKeys(template, ["specific", "generic", "tooltip"]);
		g_RawTemplateData[templateName] = template;
	}

	return g_RawTemplateData[templateName];
}


function loadUnit(templateName, civCode)
{
	//warn("  loadUnit: " + templateName);
	if (!Engine.TemplateExists(templateName))
		return null;

	var template = GetRawTemplateData(templateName);

	if (template.ProductionQueue)
	{
		if (template.ProductionQueue.Entities)
		{
			for (let build of template.ProductionQueue.Entities._string.split(" "))
			{
				build = build.replace("{civ}", civCode);

				if (g_Lists.units.indexOf(build) < 0 &&	Engine.TemplateExists(build))
					g_Lists.units.push(build);
			}
		}
	}

	if (template.Builder && template.Builder.Entities._string)
		for (let build of template.Builder.Entities._string.split(" "))
		{
			build = build.replace("{civ}", civCode);
			if (g_Lists.structures.indexOf(build) < 0 && Engine.TemplateExists(build))
			{
				warn("    add structure: " + build);
				g_Lists.structures.push(build);
			}
		}

	return template;
}

function loadStructure(templateName, civCode)
{
	//warn("  loadStructure: " + templateName);
	if (!Engine.TemplateExists(templateName))
		return null;

	var template = GetRawTemplateData(templateName);

	if (template.ProductionQueue)
	{
		if (template.ProductionQueue.Entities)
		{
			for (let build of template.ProductionQueue.Entities._string.split(" "))
			{
				build = build.replace("{civ}", civCode);

				if (g_Lists.units.indexOf(build) < 0 && Engine.TemplateExists(build))
				{
					//warn("    add unit: " + build);
					g_Lists.units.push(build);
				}
			}
		}
	}

	return template;
}
