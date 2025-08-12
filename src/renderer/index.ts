import './dashboard/courses-list'
import './app-element'
import './dashboard/course-details'
import './dashboard/repositories-list'
import './dashboard/repository-details'
import './dashboard/author-details'
import './dashboard/author-list'
import './dashboard/group-list'

import './settings-page'

import './charts/bar-chart'
import './charts/pie-chart'
import './charts/stacked-bar-chart'
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

import './screenshot-element'