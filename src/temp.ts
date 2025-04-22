import { CourseConfig } from './core';

export let s2 : CourseConfig = {
    name: 'Software Development Fundamentals',
    canvasCourseId: 44633,    
    canvasGroupsName: 'Projectteams SD S2',
    startDate: new Date(Date.parse('2025-02-10')),
    githubStudentOrg: 'HU-SD-S2-studenten-2425',
    lastMappingCheck: null,
    lastRepoCheck: null,
    lastSectionCheck: null,
    assignments: [
        {
            githubAssignment: 'sd-s2-verantwoording',
            groupAssignment: false,
            canvasId: 331688

        },
        {
            githubAssignment: 'sd-s2-project',
            groupAssignment: true

        },
    ]
}


export let cisq1 : CourseConfig = {
    name: 'Continuous Integration and Software Qua1',
    canvasCourseId: 44760,    
    canvasGroupsName: '',
    startDate: new Date(Date.parse('2025-02-04')),
    githubStudentOrg: 'huict',
    lastMappingCheck: null,
    lastRepoCheck: null,
    lastSectionCheck: null,
    assignments: [
        {
            githubAssignment: 'cisq1-lingo',
            groupAssignment: false,
            canvasId: 343090

        }
    ]
}