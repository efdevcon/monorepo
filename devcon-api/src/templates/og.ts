export const ogImageTemplate = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
    <style>{{cssStyle}}</style>
  </head>
  <body id="body">
    <div class="container {{track}} {{imageType}}">
      <svg class="icon" width="1294" height="2068" viewBox="0 0 1294 2068" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M647.013 3.3654L712.899 117.703L1268.14 1081.05L1269.4 1080.32L1268.14 1081.05L1292.02 1122.44L1264.99 1161.89L709.782 1972.45L647.013 2064.07L584.245 1972.45L29.0073 1161.89L1.98425 1122.44L25.8637 1081.02L581.101 117.703L647.013 3.3654ZM267.242 1373.45H264.053L265.856 1376.08L312.443 1444.05L312.943 1444.78H313.829H563.477H564.454L564.938 1443.93L603.648 1375.96L605.078 1373.45H602.188H267.242ZM645.553 1297.26L647.013 1299.83L648.473 1297.26L802.149 1027.52L802.623 1026.68L802.149 1025.85L648.473 756.155L647.013 753.593L645.553 756.155L491.877 1025.88L491.403 1026.71L491.877 1027.54L645.553 1297.26ZM831.946 1078.18L830.486 1075.62L829.025 1078.18L689.834 1322.5L688.402 1325.02H691.294H969.704H972.595L971.164 1322.5L831.946 1078.18ZM670.929 1444.78H673.821L672.389 1442.27L648.447 1400.27L646.987 1397.7L645.527 1400.27L621.586 1442.27L620.154 1444.78H623.046H670.929ZM602.706 1325.02H605.598L604.166 1322.5L464.948 1078.21L463.488 1075.65L462.028 1078.21L322.837 1322.5L321.405 1325.02H324.297H602.706ZM645.627 1930.49L647.013 1932.51L648.399 1930.49L946.138 1495.84L947.94 1493.21H944.751H760.087H533.965H349.275H346.087L347.888 1495.84L645.627 1930.49ZM980.197 1444.78H981.083L981.584 1444.05L1027.64 1376.81H1027.64L1028.15 1376.07L1030.67 1372.38L1203.61 1119.9L1204.21 1119.02L1203.68 1118.11L648.469 154.79L647.013 152.264L645.557 154.789L90.2416 1118.11L89.7134 1119.02L90.3111 1119.9L248.288 1350.52L249.805 1352.73L251.134 1350.4L435.1 1027.52L435.574 1026.68L435.1 1025.85L376.982 923.851L375.522 921.288L374.062 923.851L186.114 1253.75L155.682 1209.32L375.548 823.41L462.028 975.181L463.488 977.744L464.948 975.181L646.987 655.688L829.026 975.181L830.486 977.744L831.946 975.181L918.401 823.411L1138.27 1209.32L1107.83 1253.75L919.86 923.851L918.4 921.288L916.94 923.851L858.823 1025.85L858.349 1026.68L858.823 1027.52L1042.27 1349.49L1027.88 1370.51L1025.87 1373.45H691.813H688.921L690.352 1375.96L729.089 1443.93L729.572 1444.78H730.549H980.197Z" />
      </svg>

      <header>
        <img src="{{logoUrl}}" alt="{{track}}" class="logo" crossorigin="anonymous" />
        <p><span class="session-type">Session</span> {{type}}</p>
      </header>

      <main>
        <div>
          <p class="title">{{title}}</p>
          <p class="date">{{eventDay}}</p>
        </div>
        <img src="{{trackImage}}" alt="{{track}}" class="track-icon" crossorigin="anonymous" />
      </main>

      {{#if speaker}}
        <footer class="single">
          <img src="{{speaker.avatar}}" alt="{{speaker.name}}" class="avatar" crossorigin="anonymous" />
          <p>{{speaker.name}}</p>
        </footer>
      {{/if}}

      {{#if speakers}}
        <footer class="multiple">
          <div class="avatars">
            {{#each speakers}}
              <img src="{{this.avatar}}" alt="{{this.name}}" class="avatar" crossorigin="anonymous" />
            {{/each}}
          </div>
          <p>
            {{#each speakers}}
              {{this.name}}{{#unless @last}},{{/unless}}
            {{/each}}
          </p>
        </footer>
      {{/if}}
    </div>
  </body>
</html>`
