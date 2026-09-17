// Additional (optional) parameters the user can
// choose to compare between File 1 and File 2,
// besides the core QPS + Location comparison.
export const PARAMS = [
  ["mpn", "MPN"],
  ["make", "Make"],
  ["partName", "Part Name"],
  ["alternate", "Alternate"],
  ["anyOther", "Any other"],
  ["mainAlt", "Main/Alt"],
];

export const blankMap = {
  mpn1: "",
  mpn2: "",
  make1: "",
  make2: "",
  partName1: "",
  partName2: "",
  alternate1: "",
  alternate2: "",
  anyOther1: "",
  anyOther2: "",
  mainAlt1: "",
  mainAlt2: "",
};
