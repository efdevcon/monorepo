export const templateStyles = `
  *,
  *::before,
  *::after {
    font-family: Inter, sans-serif;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    color: #000;
    font-size: {{fontSize}};
  }
  .container {
    width: 100vw;
    height: 100vh;
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 2rem;
    overflow: hidden;
  }
  .video {
    padding: 3rem;
  }
  .video .icon {
    top: -220px;
    left: 1040px;
    transform: scale(1.5);
  }
  .video .logo {
    width: 500px;
  }
  .video .avatar {
    width: 120px;
    height: 120px;
  }
  .video .track-icon {
    width: 440px;
  }
  .video main {
    gap: 48px;
  }
  .video .session-type {
    margin-right: 32px;
  }
  .video .date {
    margin-top: 32px;
  }
  .video footer,
  .video .avatars {
    gap: 32px;
  }
  .icon {
    position: absolute;
    top: -580px;
    left: 400px;
    z-index: 1;
  }
  .icon path {
    stroke-opacity: 0.3;
    stroke-width: 3.36104;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    z-index: 10;
  }
  .logo {
    width: 300px;
  }
  .session-type {
    color: #666;
    margin-right: 16px;
  }
  main {
    display: flex;
    height: 100%;
    align-items: center;
    z-index: 10;
    gap: 32px;
  }
  main div {
    flex-grow: 1;
  }
  .title {
    font-size: {{scaledFontSize}};
    font-weight: bold;
  }
  .date {
    margin-top: 16px;
    color: #666;
    font-size: {{scaledFontSize}};
  }
  .track-icon {
    transform: scale(1.0);
    flex-shrink: 0;
  }
  .user-icon {
    flex-shrink: 0;
    border-radius: 50%;
    width: 255px;
    height: 255px;
    object-fit: cover;
  }
  footer {
    z-index: 10;
    display: flex;
    gap: 16px;
  }
  footer p {
    font-size: {{scaledFontSize}};
  }
  .single {
    align-items: center;
  }
  .multiple {
    flex-direction: column;
  }
  .avatars {
    display: flex;
    gap: 16px;
  }
  .avatar {
    border-radius: 50%;
    width: 60px;
    height: 60px;
    object-fit: cover;
  }
  .cryptoeconomics {
    background-color: #FFFEF4;
  }
  .cryptoeconomics path {
    stroke: #FCCE0D !important;
  }
  .developer-infrastructure {
    background-color: #F6F2FF;
  }
  .developer-infrastructure path {
    stroke: #7958A5 !important;
  }
  .governance {
    background-color: #F9FFDF;
  }
  .governance path {
    stroke: #88C43F !important;
  }
  .layer-1 {
    background-color: #E6F0FF;
  }
  .layer-1 path {
    stroke: #224490 !important;
  }
  .layer-2 {
    background-color: #E4FAFF;
  }
  .layer-2 path {
    stroke: #0DAED0 !important;
  }
  .global-impact {
    background-color: #FFFBF4;
  }
  .global-impact path {
    stroke: #F69022 !important;
  }
  .security {
    background-color: #E4FFFD;
  }
  .security path {
    stroke: #1970AE !important;
  }
  .staking {
    background-color: #FCF4FF;
  }
  .staking path {
    stroke: #E55066 !important;
  }
  .ux-design {
    background-color: #FFF4F4;
  }
  .ux-design path {
    stroke: #E42327 !important;
  }
  .zkps {
    background-color: #F2FFFA;
  }
  .zkps path {
    stroke: #00B3A4 !important;
  }`
