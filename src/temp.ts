import { CourseConfig } from './shared';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export const s2: CourseConfig = {
    name: 'Software Development Fundamentals',
    canvasId: 44633,
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

export const s3: CourseConfig = {
    name: 'Advanced Software Development',
    canvasId: 50055,
    canvasGroupsName: 'Project Groups',
    startDate: new Date(Date.parse('2025-09-01')),
    githubStudentOrg: 'HU-SD-S3-Studenten-S2526',
    lastMappingCheck: null,
    lastRepoCheck: null,
    lastSectionCheck: null,
    assignments: [
        {
            githubAssignment: 's3-portfolio',
            groupAssignment: false,
            canvasId: 373167

        },
        {
            githubAssignment: 's3-project',
            groupAssignment: true,
            canvasId: 373168

        },
    ]
}

export const cisq1: CourseConfig = {
    name: 'Continuous Integration and Software Qua1',
    canvasId: 44760,
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

export const bep2: CourseConfig = {
    name: 'Back-End Programming 2',
    canvasId: 44752,
    canvasGroupsName: '',
    startDate: new Date(Date.parse('2024-09-01')),
    githubStudentOrg: 'HU-SD-S3-studenten-2425',
    lastMappingCheck: null,
    lastRepoCheck: null,
    lastSectionCheck: null,
    assignments: [
        {
            githubAssignment: 'bep2-v2a-full',
            groupAssignment: false,
            canvasId: 315778
        },
        {
            githubAssignment: 'bep2-v2b-full',
            groupAssignment: false,
            canvasId: 315778
        },
        {
            githubAssignment: 'bep2-v2c-full',
            groupAssignment: false,
            canvasId: 315778
        },
        {
            githubAssignment: 'bep2-v2d-full',
            groupAssignment: false,
            canvasId: 315778
        },
        {
            githubAssignment: 'bep2-v2e-full',
            groupAssignment: false,
            canvasId: 315778
        },
        {
            githubAssignment: 'bep2-roulette-herkansing',
            groupAssignment: false,
            canvasId: 332209
        }
    ]
}

export const bep1: CourseConfig = {
    name: 'Back-End Programming 1',
    canvasId: 39721,
    canvasGroupsName: '',
    startDate: new Date(Date.parse('2024-04-01')),
    githubStudentOrg: 'HU-SD-BEP1-studenten-2324',
    lastMappingCheck: null,
    lastRepoCheck: null,
    lastSectionCheck: null,
    assignments: [
        {
            githubAssignment: 'finalassignment',
            groupAssignment: false,
            canvasId: 301506
        }
    ]
}

export const cisq2: CourseConfig = {
    name: 'Continuous Integration and Software Qua2',
    canvasId: 44762,
    canvasGroupsName: '',
    startDate: new Date(Date.parse('2025-04-14')),
    githubStudentOrg: 'SD-CISQ2-2025',
    lastMappingCheck: null,
    lastRepoCheck: null,
    lastSectionCheck: null,
    assignments: [
        {
            githubAssignment: 'hupol',
            groupAssignment: true,
            canvasId: 349939
        }
    ]
}



export const feb2024: CourseConfig = {
    name: 'Front-end',
    canvasId: 44689,
    canvasGroupsName: '',
    startDate: new Date(Date.parse('2024-11-01')),
    githubStudentOrg: 'HU-SD-V2FE-studenten-2425',
    lastMappingCheck: null,
    lastRepoCheck: null,
    lastSectionCheck: null,
    assignments: [
        {
            githubAssignment: 'frontend-project',
            groupAssignment: true
        }
    ]
}