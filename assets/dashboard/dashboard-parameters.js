(function installDashboardParameters(root) {
  function collect(definitions, form) {
    const parameters = {};
    for (const field of form.querySelectorAll('[data-job-parameter]')) {
      const name = field.dataset.jobParameter;
      const definition = definitions[name];
      if (!definition) continue;
      if (definition.type === 'boolean') { parameters[name] = Boolean(field.checked); continue; }
      const raw = field.value;
      if (raw === '' && definition.default === undefined && !definition.required) continue;
      if (definition.type === 'integer') {
        const value = Number(raw); if (!Number.isInteger(value)) throw new Error(`${name} must be an integer`); parameters[name] = value;
      } else if (definition.type === 'number') {
        const value = Number(raw); if (!Number.isFinite(value)) throw new Error(`${name} must be a number`); parameters[name] = value;
      } else parameters[name] = raw;
    }
    return parameters;
  }
  root.AgentControlDashboardParameters = {collect};
})(window);
