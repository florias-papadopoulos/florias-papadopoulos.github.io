---
layout: single
title: "Project A"
permalink: /projects/Master-Semester1/projectA/
author_profile: true
---

<!DOCTYPE html>
<html>
<head>
  <style>
    .dropdown {
      position: relative;
      display: inline-block;
    }

    .dropdown-content {
      display: none;
      position: absolute;
      background-color: #f9f9f9;
      min-width: 160px;
      box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
      z-index: 1;
    }

    .dropdown:hover .dropdown-content {
      display: block;
    }
  </style>
</head>
<body>
  <div class="dropdown">
    <button class="dropbtn">Dropdown</button>
    <div class="dropdown-content">
      <a href="#">Option 1</a>
      <a href="#">Option 2</a>
      <a href="#">Option 3</a>
    </div>
  </div>

  <script>
    // Get all dropdown buttons
    const dropdownButtons = document.querySelectorAll('.dropbtn');

    // Add click event listener to each dropdown button
    dropdownButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Toggle the display of the dropdown content when clicked
        button.nextElementSibling.style.display =
          button.nextElementSibling.style.display === 'block' ? 'none' : 'block';
      });
    });
  </script>
</body>
</html>

