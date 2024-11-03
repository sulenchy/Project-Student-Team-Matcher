document.addEventListener('DOMContentLoaded', () => {
  const csvFileInput = document.getElementById('csvFile');
  const csvContentDiv = document.getElementById('csvContent');
  const convertButton = document.getElementById('convertButton');
  const jsonOutputPre = document.getElementById('jsonOutput');
  const propertySelectionDiv = document.getElementById('propertySelection');
  const roleSpecificationDiv = document.getElementById('roleSpecification');
  const addRoleButton = document.getElementById('addRoleButton');
  const teamSizeInput = document.getElementById('teamSize');
  const matchButton = document.getElementById('matchButton');
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
      const arrayDuplicate = [...array];

      for (let i = arrayDuplicate.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arrayDuplicate[i], arrayDuplicate[j]] = [arrayDuplicate[j], arrayDuplicate[i]];
      }

      return arrayDuplicate
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

  function groupStudents(students, teamSize, properties, roleReqs) {
      console.log('starting ===> ', students)
      // Assign roles and calculate scores
      students.forEach(student => {
          student.role = assignRole(student, properties);
          student.score = properties.reduce((score, prop) => {
              const value = parseFloat(student[prop]);
              return score + (isNaN(value) ? 0 : value);
          }, 0);
      });

      // Sort students by score in descending order
      students.sort((a, b) => b.score - a.score);

      const teams = [];
      const numTeams = Math.ceil(students.length / teamSize);

      // Create teams with role requirements
      for (let i = 0; i < numTeams; i++) {
          teams.push({ members: [], roles: {} });
          roleReqs.forEach(req => {
              teams[i].roles[req.role] = req.count;
          });
      }

      // Distribute students to teams based on roles
      students.forEach(student => {
          let placed = false;
          for (let i = 0; i < teams.length && !placed; i++) {
              if (teams[i].roles[student.role] > 0) {
                  teams[i].members.push(student);
                  teams[i].roles[student.role]--;
                  placed = true;
              }
          }
          if (!placed) {
              // If no team needs this role, place in the team with the least members
              const teamIndex = teams.reduce((minIndex, team, index, arr) => 
                  team.members.length < arr[minIndex].members.length ? index : minIndex, 0);
              teams[teamIndex].members.push(student);
          }
      });

      console.log("ending =====> ", {students, teams})

      return teams;
  }

  function displayResults(teams) {
      resultsDiv.innerHTML = '<h3>Grouped Teams:</h3>';
      teams.forEach((team, index) => {
          const teamDiv = document.createElement('div');
          teamDiv.innerHTML = `<h4>Team ${index + 1}</h4>`;
          const ul = document.createElement('ul');
          team.members.forEach(student => {
              const li = document.createElement('li');
              const propertyInfo = selectedProperties.map(prop => `${prop}: ${student[prop]}`).join(', ');
              li.textContent = `${student.Name} (Role: ${student.role}) - ${propertyInfo}`;
              ul.appendChild(li);
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

  function addRoleInput() {
      const roleInput = document.createElement('div');
      roleInput.className = 'role-input';
      roleInput.innerHTML = `
          <input type="text" placeholder="Role name" aria-label="Role name">
          <input type="number" min="1" value="1" aria-label="Number of students for this role">
          <button type="button" class="remove-role">Remove</button>
      `;
      roleSpecificationDiv.appendChild(roleInput);

      roleInput.querySelector('.remove-role').addEventListener('click', () => {
          roleSpecificationDiv.removeChild(roleInput);
      });
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
  });

  addRoleButton.addEventListener('click', addRoleInput);

  matchButton.addEventListener('click', () => {
      if (studentsData.length === 0) {
          alert('Please convert CSV to JSON first.');
          return;
      }

      const teamSize = parseInt(teamSizeInput.value, 10);
      if (isNaN(teamSize) || teamSize < 2) {
          alert('Please enter a valid team size (minimum 2).');
          return;
      }

      selectedProperties = Array.from(propertySelectionDiv.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
      if (selectedProperties.length === 0) {
          alert('Please select at least one property for grouping.');
          return;
      }

      roleRequirements = Array.from(roleSpecificationDiv.querySelectorAll('.role-input')).map(input => ({
          role: input.querySelector('input[type="text"]').value,
          count: parseInt(input.querySelector('input[type="number"]').value, 10)
      })).filter(req => req.role && !isNaN(req.count));

      if (roleRequirements.length === 0) {
          alert('Please specify at least one role requirement.');
          return;
      }
      const shuffledStudentsData = shuffleArray(studentsData);

      const teams = groupStudents(shuffledStudentsData, teamSize, selectedProperties, roleRequirements);
      displayResults(teams);
  });
});
