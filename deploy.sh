#!/usr/bin/env sh

project="webhooks-mcbe-wtf"

deployctl deploy \
    --prod \
    --color=never \
    --entrypoint="./main.ts" \
    --project="${project}" \
    --env-file=.env

deployment_id="$(deployctl deployments list --project "${project}" --format=json | jq -r '. |= sort_by(.createdAt) | reverse | .[].deployment.id' | head -n 1)"
deployctl deployments redeploy --prod --project="${project}" --id="${deployment_id}" --env-file ".env"
