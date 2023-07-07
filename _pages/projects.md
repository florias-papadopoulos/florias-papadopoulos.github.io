---
layout: default
title: "Projects"
permalink: /projects/
author_profile: true
---

<div class="page__content" style="background-color: white; margin: 0 auto; max-width: 800px; padding: 20px;">

  <style>
    /* Custom timeline styles */
    .timeline {
      margin: 20px auto;
      padding: 20px;
    }

    .card {
      position: relative;
      max-width: 400px;
    }

    .card:nth-child(odd) {
      padding: 30px 0 30px 30px;
    }

    .card:nth-child(even) {
      padding: 30px 30px 30px 0;
    }

    .card::before {
      content: "";
      position: absolute;
      width: 50%;
      height: 100%;
      border: solid orangered;
    }

    .card:nth-child(odd)::before {
      left: 0px;
      top: 0;
      bottom: 0;
      border-width: 5px 0 5px 5px;
      border-radius: 50px 0 0 50px;
    }

    .card:nth-child(even)::before {
      right: 0;
      top: 0;
      bottom: 0;
      border-width: 5px 5px 5px 0;
      border-radius: 0 50px 50px 0;
    }

    .card:first-child::before {
      border-top: 0;
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }

    .card:last-child:nth-child(odd)::before {
      border-bottom: 0;
      border-bottom-left-radius: 0;
      border-top-left-radius: 0;
    }

    .card:last-child:nth-child(even)::before {
      border-bottom: 0;
      border-bottom-right-radius: 0;
      border-top-right-radius: 0;
    }

    .info {
      display: flex;
      flex-direction: column;
      background: white;
      color: black;
      border-radius: 10px;
      padding: 10px;
      border: 1px solid black;
    }

    .title {
      color: orangered;
      position: relative;
      cursor: pointer; /* Add cursor pointer */
    }

    .title::before {
      content: "";
      position: absolute;
      width: 10px;
      height: 10px;
      background: white;
      border-radius: 999px;
      border: 3px solid orangered;
      top: 50%;
      transform: translateY(-50%);
    }

    .card:nth-child(even) > .info > .title {
      text-align: right;
    }

    .card:nth-child(odd) > .info > .title::before {
      left: -25px;
    }

    .card:nth-child(even) > .info > .title::before {
      right: -25px;
    }
    
    /* Adjust the font size for the prompts */
    .info p {
      font-size: 16px;
    }
  </style>

  <div class="timeline">
    <div class="outer">
      <div class="card">
        <div class="info">
          <a href="../projects/project1.md">
            <h3 class="title">2023</h3>
          </a>
          <ul>
            <li><a href="../projects/project1.md">Project 1</a></li>
            <li><a href="../projects/project2.md">Project 2</a></li>
            <li><a href="../projects/project3.md">Project 3</a></li>
          </ul>
        </div>
      </div>
      <div class="card">
        <div class="info">
          <a href="../projects/projectA.md">
            <h3 class="title">2022</h3>
          </a>
          <ul>
            <li><a href="../projects/projectA.md">Project A</a></li>
            <li><a href="../projects/projectB.md">Project B</a></li>
            <li><a href="../projects/projectC.md">Project C</a></li>
          </ul>
        </div>
      </div>
      <div class="card">
        <div class="info">
          <a href="../projects/projectX.md">
            <h3 class="title">2021</h3>
          </a>
          <ul>
            <li><a href="../projects/projectX.md">Project X</a></li>
            <li><a href="../projects/projectY.md">Project Y</a></li>
            <li><a href="../projects/projectZ.md">Project Z</a></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>
