#!/bin/sh

VERSION=${1:-latest}

# Remove old binary
rm -rf /opt/schedulator/schedulator
rm -rf /opt/schedulator/public
rm -rf /opt/schedulator/migrations

# Download and extract desired schedulator version
wget -O /opt/schedulator/schedulator.zip https://github.com/PierreEVEN/schedulator/releases/$VERSION/download/schedulator_linux_musl.zip  > /opt/schedulator/update.log 2>&1
unzip /opt/schedulator/schedulator.zip -d /opt

# Install
chmod u+x /opt/schedulator/schedulator

# Cleanup
rm /opt/schedulator/schedulator.zip

# Run
/opt/schedulator/schedulator