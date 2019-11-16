EntityGroups.prototype.getEntList = function ()
{
	let ents = [];
	for (let ent in this.ents)
		ents.push(+ent);

	return ents;
};

/**
 * Display banner for the given group
 */
EntityGroups.prototype.showBanner = function()
{
	let firstUnitFound = false;

	//warn("showBanner: " + groupId + " / size " + toSelect.length);
	for (var entity in this.ents)
	{
		let ent = +entity;
		let entState = GetEntityState(ent);
		let position = entState.position;
		if (position && entState.unitAI)
		{
			// Display the banner for the first unit of the group
			if (!firstUnitFound)
			{
				Engine.PostNetworkCommand({
					"type": "set-rallypoint",
					"entities": [ent],
					"data": {"target": ent},
					"x": position.x,
					"z": position.z,
					"queued": false
				});

				// Permanently enable the banner for this group
				Engine.GuiInterfaceCall("EnableRallyPoint", {
					"entities": [ent],
					"x": position.x,
					"z": position.z,
					"queued": false
				});

				//warn("Banner: " + position.x + " / " + position.z);

				firstUnitFound = true;
			}
			else
			{
				// Hide the banner for all other units of this group
				Engine.PostNetworkCommand({
					"type": "unset-rallypoint",
					"entities": [ent]
				});

				Engine.GuiInterfaceCall("DisableRallyPoint", {
					"entities": [ent]
				});
			}
		}
	}
};

/**
 * Add entities to selection. Play selection sound unless quiet is true
 */
EntitySelection.prototype.addList = function(ents, quiet, force = false)
{
	let selection = this.toList();

	// If someone else's player is the sole selected unit, don't allow adding to the selection
	let firstEntState = selection.length == 1 && GetEntityState(selection[0]);
	if (firstEntState && firstEntState.player != g_ViewedPlayer && !force)
		return;

	let i = 1;
	let added = [];

	// ------------------------- MOD CODE --------------------------
	// Automatically expand the selection to contain the whole group
	// unless Alt (hotkey.selection.militaryonly) is pressed
	if (!Engine.HotkeyIsPressed("selection.militaryonly"))
	{
		var groupsFound = g_Groups.findGroupsForEntities(ents);
		for (let group of groupsFound)
		{
			//warn("  group size: " + Object.keys(group.ents).length);
			//group.showBanner();

			// Expand selection to contain the whole group
			for (let comrade in group.ents)
				ents.push(+comrade);
		}
	}
	// ------------------------- MOD CODE --------------------------

	for (let ent of ents)
	{
		if (selection.length + i > g_MaxSelectionSize)
			break;

		if (this.selected[ent])
			continue;

		var entState = GetEntityState(ent);
		if (!entState)
			continue;

		let isUnowned = g_ViewedPlayer != -1 && entState.player != g_ViewedPlayer ||
		                g_ViewedPlayer == -1 && entState.player == 0;

		// Don't add unowned entities to the list, unless a single entity was selected
		if (isUnowned && (ents.length > 1 || selection.length) && !force)
			continue;

		added.push(ent);
		this.selected[ent] = ent;
		++i;
	}

	_setHighlight(added, 1, true);
	_setStatusBars(added, true);
	_setMotionOverlay(added, this.motionDebugOverlay);
	if (added.length)
	{
		// Play the sound if the entity is controllable by us or Gaia-owned.
		var owner = GetEntityState(added[0]).player;
		if (!quiet && (controlsPlayer(owner) || g_IsObserver || owner == 0))
			_playSound(added[0]);
	}

	this.groups.add(this.toList()); // Create Selection Groups
	this.onChange();
};

/**
 * Find groups that contain the given entities
 */
EntityGroupsContainer.prototype.findGroupsForEntities = function (ents)
{
	var groupsFound = [];

	for (let group of this.groups)
	{
		for (let ent of ents)
		{
			if (ent in group.ents)
			{
				groupsFound.push(group);
				break;
			}
		}
	}

	return groupsFound;
};


/**
 * Cluster the given entities by their groups
 */
EntityGroupsContainer.prototype.clusterEntitiesByGroup = function (ents, groupsOnly = false)
{
	var clusters = [];
	if (!ents.length)
		return clusters;

	// Copy the original ents list, this will be modified here
	var remainingEnts = ents.slice();

	for (let group of this.groups)
	{
		let current = group.getEntList();
		// Get the selected entities that are in this group
		let selected = current.filter(x => remainingEnts.indexOf(x) >= 0);

		if (selected.length)
		{
			clusters.push(selected);
			// Only keep the entities that are not in selected
			remainingEnts = remainingEnts.filter(x => selected.indexOf(x) < 0);
		}
	}

	if (groupsOnly == false && remainingEnts.length)
		clusters.push(remainingEnts);

	return clusters;
};
