import './courses-list'
import './app-element'
import './course-details'
import './repositories-list'
import './repository-details'
import './author-details'

import './charts/bar-chart'
import './charts/pie-chart'
import './charts/stacked-bar-chart'
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);