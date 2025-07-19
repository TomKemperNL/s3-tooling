create table
    courses (        
        canvasId integer primary key,
        name text not null,        
        canvasGroups text,
        startDate text,
        githubStudentOrg text,
        lastRepoCheck text,
        lastSectionCheck text,
        lastMappingCheck text
    );

create table 
    course_assignments (
        courseId integer references courses(canvasId),
        githubAssignment text not null,
        canvasId integer,
        groupAssignment boolean not null default(false)
    );

create table
    sections (
        id integer primary key autoincrement,
        name text not null,
        courseId integer not null references courses (canvasId)
    );

create table
    students (
        id integer primary key,
        email text not null,
        name text not null
    );

create table
    students_sections (
        studentId integer not null references students (id),
        sectionId integer not null references sections (id),
        primary key (studentId, sectionId)
    );

create table githubAccounts(
    username text primary key,
    studentId integer references students (id)
);

create table githubCommitNames(
    organization text not null references repositories(organization),
    repository text not null references repositories(name),
    name text not null,
    email text,
    githubUsername text not null references githubAccounts(username),
    primary key (organization, repository, name)
    foreign key(organization, repository) references repositories(organization, name)
);

create table 
    repositories (
        courseId integer not null references courses (canvasId),        
        organization text,
        name text,
        full_name text,
        priv boolean,
        html_url text,
        ssh_url text,
        api_url text,
        created_at text,
        updated_at text,       
        lastMemberCheck text,
        primary key (organization, name)
    );

create table repository_members(
    organization text not null,
    name text not null,
    username text not null references githubAccounts(username),
    primary key(organization, name, username)
    foreign key(organization, name) references repositories(organization, name)
);