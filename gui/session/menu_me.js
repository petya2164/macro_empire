function closeOpenDialogsOrShowExit()
{
	let anyOpenDialog = g_IsMenuOpen || g_IsDiplomacyOpen || g_IsTradeOpen ||
		g_IsObjectivesOpen || !Engine.GetGUIObjectByName("chatDialogPanel").hidden;

	closeOpenDialogs();

	if (!anyOpenDialog)
		exitMenuButton();
}