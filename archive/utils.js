function getDeep(options = {}) {
  const { target, path, fallback } = options;
  const pathArray = Array.isArray(path)
    ? path
    : path.split(".").filter(Boolean);
  const value = pathArray.reduce((acc, key) => acc && acc[key], target);

  if (value === undefined && "fallback" in options) {
    return fallback;
  }
  return value;
}

function setDeep(options = {}) {
  const { target, path, value } = options;
  const pathArray = Array.isArray(path)
    ? path
    : path.split(".").filter(Boolean);
  pathArray.reduce((acc, key, index) => {
    const isNextKeyNumeric = /^\d+$/.test(pathArray[index + 1]);

    if (index === pathArray.length - 1) {
      acc[key] = value;
    } else if (!acc[key] || typeof acc[key] !== "object") {
      // non-object intermediate path items are overwritten
      acc[key] = isNextKeyNumeric ? [] : {};
    }

    return acc[key];
  }, target);

  return target;
}