/*
 *	Permanently enable the rally point rendering for the selected unit
 */
GuiInterface.prototype.EnableRallyPoint = function (player, cmd)
{
	let cmpPlayer = QueryPlayerIDInterface(player);

	// Show the rally points for the passed entities
	for (let ent of cmd.entities)
	{
		let cmpIdentity = Engine.QueryInterface(ent, IID_Identity);
		//warn("EnableRallyPoint: entity " + cmpIdentity.GetGenericName());

		// entity must have a rally point component to display a rally point marker
		// (regardless of whether cmd specifies a custom location)
		let cmpRallyPoint = Engine.QueryInterface(ent, IID_RallyPoint);
		if (!cmpRallyPoint)
			continue;
		//warn("EnableRallyPoint: cmpRallyPoint");

		let cmpRallyPointRenderer = Engine.QueryInterface(ent, IID_RallyPointRenderer);
		if (!cmpRallyPointRenderer)
			continue;
		//warn("EnableRallyPoint: cmpRallyPointRenderer");

		// Verify the owner
		let cmpOwnership = Engine.QueryInterface(ent, IID_Ownership);
		if (!(cmpPlayer && cmpPlayer.CanControlAllUnits()))
			if (!cmpOwnership || cmpOwnership.GetOwner() != player)
				continue;
		//warn("EnableRallyPoint: cmpOwnership");

		// If the command was passed an explicit position, use that and
		// override the real rally point position; otherwise use the real position
		let pos;
		if (cmd.x && cmd.z)
			pos = cmd;
		else
			pos = cmpRallyPoint.GetPositions()[0]; // may return undefined if no rally point is set

		if (pos)
		{
			// Only update the position if we changed it (cmd.queued is set)
			if ("queued" in cmd)
				if (cmd.queued == true)
					cmpRallyPointRenderer.AddPosition({ 'x': pos.x, 'y': pos.z }); // AddPosition takes a CFixedVector2D which has X/Y components, not X/Z
				else
					cmpRallyPointRenderer.SetPosition({ 'x': pos.x, 'y': pos.z }); // SetPosition takes a CFixedVector2D which has X/Y components, not X/Z

			// rebuild the renderer when not set (when reading saved game or in case of building update)
			else if (!cmpRallyPointRenderer.IsSet())
				for (let posi in cmpRallyPoint.GetPositions())
					cmpRallyPointRenderer.AddPosition({ 'x': posi.x, 'y': posi.z });

			cmpRallyPointRenderer.SetDisplayed(true);

			//warn("EnableRallyPoint: pos " + pos.x + " / " + pos.z);
		}
	}
};

/*
 *	Hide the rally point for the selected unit
 */
GuiInterface.prototype.DisableRallyPoint = function (player, cmd)
{
	let cmpPlayer = QueryPlayerIDInterface(player);

	// If there are some rally points already displayed, first hide them
	for (let ent of cmd.entities)
	{
		let cmpRallyPointRenderer = Engine.QueryInterface(ent, IID_RallyPointRenderer);
		if (cmpRallyPointRenderer)
			cmpRallyPointRenderer.SetDisplayed(false);
	}
};

/*
 *	Display the rally point for the selected building (when it is selected)
 */
GuiInterface.prototype.DisplayRallyPoint = function (player, cmd)
{
	let cmpPlayer = QueryPlayerIDInterface(player);

	// If there are some rally points already displayed, first hide them
	for (let ent of this.entsRallyPointsDisplayed)
	{
		let cmpRallyPointRenderer = Engine.QueryInterface(ent, IID_RallyPointRenderer);
		if (cmpRallyPointRenderer)
			cmpRallyPointRenderer.SetDisplayed(false);
	}

	this.entsRallyPointsDisplayed = [];

	// Show the rally points for the passed entities
	for (let ent of cmd.entities)
	{
		// DisplayRallyPoint is only used for building rally points
		let cmpBuildingAI = Engine.QueryInterface(ent, IID_BuildingAI);
		if (!cmpBuildingAI)
			continue;

		let cmpIdentity = Engine.QueryInterface(ent, IID_Identity);
		//warn("DisplayRallyPoint: entity " + cmpIdentity.GetGenericName());

		// entity must have a rally point component to display a rally point marker
		// (regardless of whether cmd specifies a custom location)
		let cmpRallyPoint = Engine.QueryInterface(ent, IID_RallyPoint);
		if (!cmpRallyPoint)
			continue;
		//warn("DisplayRallyPoint: cmpRallyPoint");

		let cmpRallyPointRenderer = Engine.QueryInterface(ent, IID_RallyPointRenderer);
		if (!cmpRallyPointRenderer)
			continue;
		//warn("DisplayRallyPoint: cmpRallyPointRenderer");

		// Verify the owner
		let cmpOwnership = Engine.QueryInterface(ent, IID_Ownership);
		if (!(cmpPlayer && cmpPlayer.CanControlAllUnits()))
			if (!cmpOwnership || cmpOwnership.GetOwner() != player)
				continue;
		//warn("DisplayRallyPoint: cmpOwnership");

		// If the command was passed an explicit position, use that and
		// override the real rally point position; otherwise use the real position
		let pos;
		if (cmd.x && cmd.z)
			pos = cmd;
		else
			pos = cmpRallyPoint.GetPositions()[0]; // may return undefined if no rally point is set

		if (pos)
		{
			// Only update the position if we changed it (cmd.queued is set)
			if ("queued" in cmd)
				if (cmd.queued == true)
					cmpRallyPointRenderer.AddPosition({ 'x': pos.x, 'y': pos.z }); // AddPosition takes a CFixedVector2D which has X/Y components, not X/Z
				else
					cmpRallyPointRenderer.SetPosition({ 'x': pos.x, 'y': pos.z }); // SetPosition takes a CFixedVector2D which has X/Y components, not X/Z

			// rebuild the renderer when not set (when reading saved game or in case of building update)
			else if (!cmpRallyPointRenderer.IsSet())
				for (let posi in cmpRallyPoint.GetPositions())
					cmpRallyPointRenderer.AddPosition({ 'x': posi.x, 'y': posi.z });

			cmpRallyPointRenderer.SetDisplayed(true);

			// remember which entities have their rally points displayed so we can hide them again
			this.entsRallyPointsDisplayed.push(ent);
			//warn("DisplayRallyPoint: pos " + pos.x + " / " + pos.z);
		}
	}
};

GuiInterface.prototype.GetRawTemplateData = function(player, extendedName)
{
	let name = extendedName;
	// Special case for garrisoned units which have a extended template
	if (extendedName.indexOf("&") != -1)
		name = extendedName.slice(extendedName.indexOf("&")+1);

	let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	let template = cmpTemplateManager.GetTemplate(name);

	return template;
};

GuiInterface.prototype.GetAllBuildableEntities = function(player, cmd)
{
	let buildableEnts = [];
	for (let ent of cmd.entities)
	{
		let cmpIdentity = Engine.QueryInterface(ent, IID_Identity);
		if (!cmpIdentity)
			continue;
		// Only the CivCentre is allowed to construct other buildings
		//if (cmpIdentity.GetClassesList().indexOf('CivCentre') < 0)
		//	continue;

		let cmpBuilder = Engine.QueryInterface(ent, IID_Builder);
		if (!cmpBuilder)
			continue;

		for (let building of cmpBuilder.GetEntitiesList())
			if (buildableEnts.indexOf(building) == -1)
				buildableEnts.push(building);
	}
	return buildableEnts;
};

GuiInterface.prototype.FindBuildingToTrainEntity = function(player, cmd)
{
	var cmpOwnership = Engine.QueryInterface(cmd.searchEntity, IID_Ownership);
	if (!cmpOwnership || cmpOwnership.GetOwner() == -1)
		return undefined;

	// Find buildings owned by this unit's player
	var players = [cmpOwnership.GetOwner()];

	var range = 128; // TODO: what's a sensible number?

	var cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	var nearby = cmpRangeManager.ExecuteQuery(
		cmd.searchEntity, 0, range, players, IID_ProductionQueue);

	return nearby.find(ent => {
		let queue = Engine.QueryInterface(ent, IID_ProductionQueue);
		return queue.GetEntitiesList().indexOf(cmd.trainEntity) != -1;
	});
};


// Expose new GuiInterface functions:
let extraFunctions = {
	"EnableRallyPoint": 1,
	"DisableRallyPoint": 1,
	"GetRawTemplateData": 1,
	"FindBuildingToTrainEntity": 1,
};

GuiInterface.prototype._ScriptCall_original = GuiInterface.prototype.ScriptCall;

GuiInterface.prototype.ScriptCall = function(player, name, args)
{
	if (extraFunctions[name])
		return this[name](player, args);
	else
		return this._ScriptCall_original(player, name, args);
};
