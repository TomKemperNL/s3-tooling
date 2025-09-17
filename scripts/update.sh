for dir in */ ; do
    if [ -d "$dir/.git" ]; then
        echo "Pulling in $dir..."
        (cd "$dir" && git pull)
    else
        echo "Skipping $dir (not a git repo)"
    fi
done