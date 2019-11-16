// Override updateGroups() from session.js
function updateGroups()
{
	//warn("updateGroups override");
	g_Groups.update();

	// Determine the sum of the costs of a given template
	let getCostSum = (ent) =>
	{
		let cost = GetTemplateData(GetEntityState(ent).template).cost;
		return cost ? Object.keys(cost).map(key => cost[key]).reduce((sum, cur) => sum + cur) : 0;
	};

	for (let i in Engine.GetGUIObjectByName("unitGroupPanel").children)
	{
		Engine.GetGUIObjectByName("unitGroupLabel[" + i + "]").caption = i;

		let button = Engine.GetGUIObjectByName("unitGroupButton[" + i + "]");
		button.hidden = g_Groups.groups[i].getTotalCount() == 0;
		button.onpress = (function (i) { return function () { performGroup((Engine.HotkeyIsPressed("selection.add") ? "add" : "select"), i); }; })(i);
		button.ondoublepress = (function (i) { return function () { performGroup("snap", i); }; })(i);
		button.onpressright = (function (i) { return function () { performGroup("breakUp", i); }; })(i);

		// Chose icon of the most common template (or the most costly if it's not unique)
		if (g_Groups.groups[i].getTotalCount() > 0)
		{
			let icon = GetTemplateData(GetEntityState(g_Groups.groups[i].getEntsGrouped().reduce((pre, cur) =>
			{
				if (pre.ents.length == cur.ents.length)
					return getCostSum(pre.ents[0]) > getCostSum(cur.ents[0]) ? pre : cur;
				return pre.ents.length > cur.ents.length ? pre : cur;
			}).ents[0]).template).icon;

			Engine.GetGUIObjectByName("unitGroupIcon[" + i + "]").sprite =
				icon ? ("stretched:session/portraits/" + icon) : "groupsIcon";

			// ------------------------- MOD CODE --------------------------
			// Show the banner for each group that contains at least one unit
			g_Groups.groups[i].showBanner();
			// ------------------------- MOD CODE --------------------------
		}

		setPanelObjectPosition(button, i, 1);
	}
}
