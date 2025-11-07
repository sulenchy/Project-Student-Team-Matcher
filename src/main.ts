const csvFileInput = document.getElementById("csvFile");
const csvContentDiv = document.getElementById("csvContent");
const convertButton = document.getElementById("convertButton");
const jsonOutputPre = document.getElementById("jsonOutput");
const copyJsonButton = document.getElementById("copyJsonButton");
const propertySelectionDiv = document.getElementById("propertySelection");
const roleSpecificationDiv = document.getElementById("roleSpecification");
const addRoleButton = document.getElementById("addRoleButton");
const matchButton = document.getElementById("matchButton");
const reshuffleButton = document.getElementById("reshuffleButton") as HTMLButtonElement | null;
const resultsDiv = document.getElementById("results");

interface student {
  ["ID"]: string;
  ["Start time"]: string;
  ["Completion time"]: string;
  ["Email"]: string;
  ["Name"]: string;
  ["Last modified time"]: string;
  ["Your name"]: string;
  ["Your GitHub username"]: string;
  ["Scrum Master"]: string;
  ["Quality Assurance"]: string;
  ["Developer"]: string;
  ["I understand that I will be working as part of a team on a real application project and agree to communicate fairly and professionally with colleagues."]: string;
  role?: string;
  score?: number;
  preferences?: string[];
  [key: string]: string | number | string[] | undefined;
}

interface Rolerequirement {
  role: string;
  count: number;
}

interface Team {
  members: student[];
  roles: Record<string, number>;
}

let csvContent: string = "";
let studentsData: student[] = [];
let headers: string[] = [];
let selectedProperties: string[] = [];
let roleRequirements: Rolerequirement[] = [];

function csvToJSON(csv: string): Record<string, string>[] {
  const lines = csv.split("\n");
  const result = [];
  headers = lines[0].split(",").map((header) => header.trim());
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const obj: Record<string, string> = {};
    const currentline = lines[i].split(",");

    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = currentline[j].trim();
    }
    result.push(obj);
  }
  return result;
}

function shuffleArray(array: student[]): student[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getRolePreferences(
  student: student,
  properties: (keyof student)[]
): string[] {
  return properties
    .map((prop) => ({
      role: prop as string,
      score: parseFloat(String(student[prop] ?? "0")),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.role);
}

function groupStudents(
  students: student[],
  roleReqs: Rolerequirement[]
): Team[] {
  // Assign preferences and calculate scores
  students.forEach((student) => {
    student.preferences = getRolePreferences(student, selectedProperties as (keyof student)[]);
    student.score = selectedProperties.reduce((score, prop) => {
      const value = parseFloat(String(student[prop] ?? "0"));
      return score + (isNaN(value) ? 0 : value);
    }, 0);
  });

  // Sort students by score in descending order
  students.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const totalStudentsPerTeam = roleReqs.reduce(
    (sum, req) => sum + req.count,
    0
  );
  const numTeams = Math.ceil(students.length / totalStudentsPerTeam);

  // Initialize teams
  const teams: Team[] = Array.from({ length: numTeams }, () => ({
    members: [],
    roles: roleReqs.reduce(
      (acc, req) => ({ ...acc, [req.role]: req.count }),
      {}
    ),
  }));

  const unassignedStudents: student[] = [];

  // First pass: Assign students to their first preference
  students.forEach((student) => {
    const firstPreference = student.preferences?.[0];
    if (firstPreference) {
      const teamIndex = teams.findIndex(
        (team) => (team.roles[firstPreference] ?? 0) > 0
      );
      if (teamIndex !== -1) {
        student.role = firstPreference;
        teams[teamIndex].members.push(student);
        teams[teamIndex].roles[firstPreference]--;
      } else {
        unassignedStudents.push(student);
      }
    } else {
      // No preferences available — keep student in unassigned list for later distribution
      unassignedStudents.push(student);
    }
  });

  // Second pass: Assign remaining students to their second preference
  const stillUnassignedStudents: student[] = [];
  unassignedStudents.forEach((student) => {
    const secondPreference = student.preferences?.[1];
    if (secondPreference) {
      const teamIndex = teams.findIndex(
        (team) => (team.roles[secondPreference] ?? 0) > 0
      );
      if (teamIndex !== -1) {
        student.role = secondPreference;
        teams[teamIndex].members.push(student);
        teams[teamIndex].roles[secondPreference]--;
      } else {
        stillUnassignedStudents.push(student);
      }
    } else {
      // No second preference available — keep student in unassigned list for final distribution
      stillUnassignedStudents.push(student);
    }
  });

  // Final pass: Distribute any unassigned students to any available slot
  stillUnassignedStudents.forEach((student) => {
    let assigned = false;
    for (let i = 0; i < teams.length; i++) {
      const availableRole = Object.keys(teams[i].roles).find(
        (role) => teams[i].roles[role] > 0
      );
      if (availableRole) {
        student.role = availableRole;
        teams[i].members.push(student);
        teams[i].roles[availableRole]--;
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      // If no roles are available, add to the smallest team
      const teamIndex = teams.reduce(
        (minIndex, team, index, arr) =>
          team.members.length < arr[minIndex].members.length ? index : minIndex,
        0
      );
      teams[teamIndex].members.push(student);
    }
  });

  return teams;
}

function displayResults(teams: Team[]) {
  if (!resultsDiv) {
    console.error("No results container found");
    return;
  }
  resultsDiv.innerHTML = "<h3>Grouped Teams:</h3>";
  teams.forEach((team, index) => {
    const teamDiv = document.createElement("div");
    teamDiv.innerHTML = `<h4>Team ${index + 1}</h4>`;
    const ul = document.createElement("ul");

    // Group members by role
    const roleGroups = team.members.reduce((groups: Record<string, student[]>, member) => {
      const role = member.role || 'Unassigned';
      if (!groups[role]) {
        groups[role] = [];
      }
      groups[role].push(member);
      return groups;
    }, {});

    // Display members grouped by role
    Object.entries(roleGroups).forEach(([role, members]) => {
      const roleLi = document.createElement("li");
      roleLi.innerHTML = `<strong>${role} (${(members as student[]).length}):</strong>`;
      const memberUl = document.createElement("ul");
      (members as student[]).forEach((student) => {
        const memberLi = document.createElement("li");
        const propertyInfo = selectedProperties
          .map((prop) => `${prop}: ${student[prop]}`)
          .join(", ");
        memberLi.textContent = `${student.Name} - ${propertyInfo}`;
        memberUl.appendChild(memberLi);
      });
      roleLi.appendChild(memberUl);
      ul.appendChild(roleLi);
    });

    teamDiv.appendChild(ul);
    resultsDiv.appendChild(teamDiv);
  });
}

function createPropertyCheckboxes() {
  (propertySelectionDiv as HTMLDivElement).innerHTML =
    "<h3>Select properties for grouping:</h3>";
  propertySelectionDiv?.classList.add("card-content-wrapper");
  headers.forEach((header) => {
    if (header !== "name") {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = header;
      checkbox.name = header;
      checkbox.value = header;

      const label = document.createElement("label");
      label.htmlFor = header;
      label.appendChild(document.createTextNode(header));
      const div = document.createElement("div");
      div?.appendChild(checkbox);
      div?.appendChild(label);
      propertySelectionDiv?.appendChild(div);
      propertySelectionDiv?.appendChild(document.createElement("br"));
    }
  });
}

function createRoleDropdown() {
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Role name");
  select.setAttribute("style", "width: 200px");
  headers.forEach((header) => {
    if (header !== "name") {
      const option = document.createElement("option");
      option.value = header;
      option.textContent = header;
      select.appendChild(option);
    }
  });
  return select;
}

function addRoleInput() {
  const roleInput = document.createElement("div");
  roleInput.className = "role-input";
  const roleDropdown = createRoleDropdown();
  roleInput.appendChild(roleDropdown);

  const countInput = document.createElement("input");
  countInput.type = "number";
  countInput.min = "1";
  countInput.value = "1";
  countInput.setAttribute("aria-label", "Number of students for this role");
  roleInput.appendChild(countInput);

  const removeButton = document.createElement("button");
  removeButton.textContent = "Remove";
  removeButton.className = "remove-role";
  if (roleSpecificationDiv) {
    removeButton.addEventListener("click", () => {
      roleSpecificationDiv.removeChild(roleInput);
    });
    roleInput.appendChild(removeButton);

    roleSpecificationDiv.appendChild(roleInput);
  }
}

if (csvFileInput)
  csvFileInput.addEventListener("change", (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = (e.target as FileReader).result;
      if (typeof result === "string") {
        csvContent = result;
      } else if (result instanceof ArrayBuffer) {
        csvContent = new TextDecoder().decode(result);
      } else {
        csvContent = "";
      }
      if (csvContentDiv) {
        csvContentDiv.classList.add("card-content-wrapper");
        csvContentDiv.innerHTML =
          "<h3>CSV Content:</h3><pre>" + csvContent + "</pre>";
      }
      if (convertButton) (convertButton as HTMLButtonElement).disabled = false;
    };

    if (file) {
      reader.readAsText(file);
    }
  });

if (convertButton) {
  convertButton.addEventListener("click", () => {
    studentsData = csvToJSON(csvContent) as student[];
    jsonOutputPre?.setAttribute("style", "height: 500px; overflow: auto");
    if (jsonOutputPre) {
      jsonOutputPre.textContent = JSON.stringify(studentsData, null, 2);
    }
    createPropertyCheckboxes();
    if (matchButton) (matchButton as HTMLButtonElement).disabled = false;
    if (copyJsonButton) (copyJsonButton as HTMLButtonElement).disabled = false;
    if (reshuffleButton) (reshuffleButton as HTMLButtonElement).disabled = false;
  });
}

function copyToClipboard({
  btn,
  container,
}: {
  btn: HTMLElement | null;
  container: HTMLElement | null;
}): void {
  if (btn && container) {
    btn.addEventListener("click", () => {
      navigator.clipboard
        .writeText(container.innerText)
        .then(() => {
          alert("JSON copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy JSON: ", err);
        });
    });
  } else {
    console.error("Error due to invalid element. Failed to copy JSON");
  }
}

copyToClipboard({ btn: copyJsonButton, container: jsonOutputPre });

if (addRoleButton) addRoleButton.addEventListener("click", addRoleInput);

if (matchButton)
  matchButton.addEventListener("click", () => {
    if (studentsData.length === 0) {
      alert("Please convert CSV to JSON first.");
      return;
    }

    if (!propertySelectionDiv || !roleSpecificationDiv) {
      alert("Required elements not found.");
      return;
    }

    selectedProperties = Array.from(
      propertySelectionDiv.querySelectorAll('input[type="checkbox"]:checked')
    ).map((cb) => (cb as HTMLInputElement).value);
    if (selectedProperties.length === 0) {
      alert("Please select at least one property for grouping.");
      return;
    }

    roleRequirements = Array.from(
      roleSpecificationDiv.querySelectorAll(".role-input")
    )
      .map((input) => ({
        role: (input.querySelector("select") as HTMLSelectElement).value,
        count: parseInt((input.querySelector('input[type="number"]') as HTMLInputElement).value, 10),
      }))
      .filter((req) => req.role && !isNaN(req.count));

    if (roleRequirements.length === 0) {
      alert("Please specify at least one role requirement.");
      return;
    }

    const teams = groupStudents(studentsData, roleRequirements);
    displayResults(teams);
    if (reshuffleButton) reshuffleButton.disabled = false;
  });

reshuffleButton?.addEventListener("click", () => {
  const reshuffledData = shuffleArray(studentsData);
  if (jsonOutputPre) {
    jsonOutputPre.setAttribute("style", "height: 500px; overflow: auto");
    jsonOutputPre.textContent = JSON.stringify(reshuffledData, null, 2);
  } else {
    console.warn("jsonOutputPre element not found; cannot display reshuffled JSON.");
  }
});

// Bring the next card into the center of the viewport when the current card is clicked.
const steps = document.querySelectorAll(".row-grid .step");

function activateStep({
  currentIndex,
  direction,
}: {
  currentIndex: number;
  direction: "next" | "prev";
}) {
  // Remove 'active' from all steps
  steps.forEach((c) => c.classList.remove("active"));

  // Determine the next card index (loop to first if at end)
  const nextIndex =
    direction === "next"
      ? (currentIndex + 1) % steps.length
      : (currentIndex - 1 + steps.length) % steps.length;
  const nextStep = steps[nextIndex] as Element;

  // Center the next card in the scroll container
  nextStep.scrollIntoView({
    behavior: "smooth",
    inline: "center",
    block: "nearest",
  });
  nextStep.classList.add("active");

  // Update prev/next button visibility and disabled state
  const prevBtn = document.getElementById("prevButton");
  const nextBtn = document.getElementById("nextButton");

  if (nextIndex === 0) {
    prevBtn?.classList.add("invisible");
    prevBtn?.setAttribute("disabled", "true");
  } else {
    prevBtn?.classList.remove("invisible");
    prevBtn?.removeAttribute("disabled");
  }

  if (nextIndex === steps.length - 1) {
    nextBtn?.classList.add("invisible");
    nextBtn?.setAttribute("disabled", "true");
  } else {
    nextBtn?.classList.remove("invisible");
    nextBtn?.removeAttribute("disabled");
  }
}

// Attach navigation event listeners outside of activateStep and ensure activeStep is non-null before use.
document.getElementById("nextButton")?.addEventListener("click", () => {
  const activeStep = document.querySelector(".row-grid .step.active");
  if (activeStep) {
    const currentIndex = Array.from(steps).indexOf(activeStep);
    if (currentIndex !== -1) {
      activateStep({ currentIndex, direction: "next" });
    }
  }
});

document.getElementById("prevButton")?.addEventListener("click", () => {
  const activeStep = document.querySelector(".row-grid .step.active");
  if (activeStep) {
    const currentIndex = Array.from(steps).indexOf(activeStep);
    if (currentIndex > 0) {
      activateStep({ currentIndex, direction: "prev" });
    }
  }
});

// Optionally activate the first one on load:
window.addEventListener("load", () => {
  if (steps.length) {
    steps[0].classList.add("active");
    steps[0].scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }
  document.getElementById("prevButton")?.classList.add("invisible");
});
