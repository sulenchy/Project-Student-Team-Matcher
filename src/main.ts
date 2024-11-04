document.addEventListener('DOMContentLoaded', () => {
  const csvFileInput = document.getElementById('csvFile');
  const csvContentDiv = document.getElementById('csvContent');
  const convertButton = document.getElementById('convertButton');
  const jsonOutputPre = document.getElementById('jsonOutput');
  const copyJsonButton = document.getElementById('copyJsonButton');
  const propertySelectionDiv = document.getElementById('propertySelection');
  const roleSpecificationDiv = document.getElementById('roleSpecification');
  const addRoleButton = document.getElementById('addRoleButton');
  const matchButton = document.getElementById('matchButton');
  const reshuffleButton = document.getElementById('reshuffleButton');
  const resultsDiv = document.getElementById('results');

  let csvContent = '';
  let studentsData = [];
  let headers = [];
  let selectedProperties = [];
  let roleRequirements = [];

  function csvToJSON(csv) {
      const lines = csv.split('\n');
      const result = [];
      headers = lines[0].split(',').map(header => header.trim());

      for (let i = 1; i < lines.length; i++) {
          if (!lines[i]) continue;
          const obj = {};
          const currentline = lines[i].split(',');

          for (let j = 0; j < headers.length; j++) {
              obj[headers[j]] = currentline[j].trim();
          }
          result.push(obj);
      }
      return result;
  }

  function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
      }
  }

  function assignRole(student, properties) {
      let maxValue = -Infinity;
      let role = '';
      properties.forEach(prop => {
          const value = parseFloat(student[prop]);
          if (!isNaN(value) && value > maxValue) {
              maxValue = value;
              role = prop;
          }
      });
      return role;
  }

  function groupStudents(students, roleReqs) {
      // Assign initial roles and calculate scores
      students.forEach(student => {
          student.role = assignRole(student, selectedProperties);
          student.score = selectedProperties.reduce((score, prop) => {
              const value = parseFloat(student[prop]);
              return score + (isNaN(value) ? 0 : value);
          }, 0);
      });

      // Sort students by score in descending order
      students.sort((a, b) => b.score - a.score);

      const totalStudentsPerTeam = roleReqs.reduce((sum, req) => sum + req.count, 0);
      const numTeams = Math.floor(students.length / totalStudentsPerTeam);

      // Initialize teams
      const teams = Array.from({ length: numTeams }, () => ({
          members: [],
          roles: roleReqs.reduce((acc, req) => ({ ...acc, [req.role]: req.count }), {})
      }));

      // First pass: Assign students to their best-fit roles
      students.forEach(student => {
          const teamIndex = teams.findIndex(team => team.roles[student.role] > 0);
          if (teamIndex !== -1) {
              teams[teamIndex].members.push(student);
              teams[teamIndex].roles[student.role]--;
          }
      });

      // Second pass: Assign remaining students to any available role
      students.filter(student => !teams.some(team => team.members.includes(student))).forEach(student => {
          for (let i = 0; i < teams.length; i++) {
              const availableRole = Object.keys(teams[i].roles).find(role => teams[i].roles[role] > 0);
              if (availableRole) {
                  student.role = availableRole;
                  teams[i].members.push(student);
                  teams[i].roles[availableRole]--;
                  break;
              }
          }
      });

      // Final pass: Distribute any unassigned students
      const unassignedStudents = students.filter(student => !teams.some(team => team.members.includes(student)));
      unassignedStudents.forEach(student => {
          const teamIndex = teams.reduce((minIndex, team, index, arr) => 
              team.members.length < arr[minIndex].members.length ? index : minIndex, 0);
          teams[teamIndex].members.push(student);
      });

      return teams;
  }

  function displayResults(teams) {
      resultsDiv.innerHTML = '<h3>Grouped Teams:</h3>';
      teams.forEach((team, index) => {
          const teamDiv = document.createElement('div');
          teamDiv.innerHTML = `<h4>Team ${index + 1}</h4>`;
          const ul = document.createElement('ul');
          
          // Group members by role
          const roleGroups = team.members.reduce((groups, member) => {
              if (!groups[member.role]) {
                  groups[member.role] = [];
              }
              groups[member.role].push(member);
              return groups;
          }, {});

          // Display members grouped by role
          Object.entries(roleGroups).forEach(([role, members]) => {
              const roleLi = document.createElement('li');
              roleLi.innerHTML = `<strong>${role} (${members.length}):</strong>`;
              const memberUl = document.createElement('ul');
              members.forEach(student => {
                  const memberLi = document.createElement('li');
                  const propertyInfo = selectedProperties.map(prop => `${prop}: ${student[prop]}`).join(', ');
                  memberLi.textContent = `${student.name} - ${propertyInfo}`;
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
      propertySelectionDiv.innerHTML = '<h3>Select properties for grouping:</h3>';
      headers.forEach(header => {
          if (header !== 'name') {
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.id = header;
              checkbox.name = header;
              checkbox.value = header;

              const label = document.createElement('label');
              label.htmlFor = header;
              label.appendChild(document.createTextNode(header));

              propertySelectionDiv.appendChild(checkbox);
              propertySelectionDiv.appendChild(label);
              propertySelectionDiv.appendChild(document.createElement('br'));
          }
      });
  }

  function createRoleDropdown() {
      const select = document.createElement('select');
      select.setAttribute('aria-label', 'Role name');
      headers.forEach(header => {
          if (header !== 'name') {
              const option = document.createElement('option');
              option.value = header;
              option.textContent = header;
              select.appendChild(option);
          }
      });
      return select;
  }

  function addRoleInput() {
      const roleInput = document.createElement('div');
      roleInput.className = 'role-input';
      const roleDropdown = createRoleDropdown();
      roleInput.appendChild(roleDropdown);
      
      const countInput = document.createElement('input');
      countInput.type = 'number';
      countInput.min = '1';
      countInput.value = '1';
      countInput.setAttribute('aria-label', 'Number of students for this role');
      roleInput.appendChild(countInput);

      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove';
      removeButton.className = 'remove-role';
      removeButton.addEventListener('click', () => {
          roleSpecificationDiv.removeChild(roleInput);
      });
      roleInput.appendChild(removeButton);

      roleSpecificationDiv.appendChild(roleInput);
  }

  csvFileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
          csvContent = e.target.result;
          csvContentDiv.innerHTML = '<h3>CSV Content:</h3><pre>' + csvContent + '</pre>';
          convertButton.disabled = false;
      };

      reader.readAsText(file);
  });

  convertButton.addEventListener('click', () => {
      studentsData = csvToJSON(csvContent);
      jsonOutputPre.textContent = JSON.stringify(studentsData, null, 2);
      createPropertyCheckboxes();
      matchButton.disabled = false;
      copyJsonButton.disabled = false;
  });

  copyJsonButton.addEventListener('click', () => {
      navigator.clipboard.writeText(jsonOutputPre.textContent).then(() => {
          alert('JSON copied to clipboard!');
      }).catch(err => {
          console.error('Failed to copy JSON: ', err);
      });
  });

  addRoleButton.addEventListener('click', addRoleInput);

  matchButton.addEventListener('click', () => {
      if (studentsData.length === 0) {
          alert('Please convert CSV to JSON first.');
          return;
      }

      selectedProperties = Array.from(propertySelectionDiv.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
      if (selectedProperties.length === 0) {
          alert('Please select at least one property for grouping.');
          return;
      }

      roleRequirements = Array.from(roleSpecificationDiv.querySelectorAll('.role-input')).map(input => ({
          role: input.querySelector('select').value,
          count: parseInt(input.querySelector('input[type="number"]').value, 10)
      })).filter(req => req.role && !isNaN(req.count));

      if (roleRequirements.length === 0) {
          alert('Please specify at least one role requirement.');
          return;
      }

      const teams = groupStudents(studentsData, roleRequirements);
      displayResults(teams);
      reshuffleButton.disabled = false;
  });

  reshuffleButton.addEventListener('click', () => {
      shuffleArray(studentsData);
      const teams = groupStudents(studentsData, roleRequirements);
      displayResults(teams);
  });
});